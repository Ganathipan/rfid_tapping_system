const express = require('express');
const router = express.Router();
const { adminUser } = require('../adminLogin');

// In-memory storage for admin portals
let portals = [];
let nextId = 1;

// Helpers
function toNumber(n) {
  if (n === null || n === undefined || n === '') return NaN;
  const num = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(num) ? num : NaN;
}

function toInt(n) {
  const num = toNumber(n);
  return Number.isFinite(num) ? Math.trunc(num) : NaN;
}

function validatePortalConfig(body) {
  const errors = [];

  // clusters
  if (!Array.isArray(body.clusters)) {
    errors.push({ field: 'clusters', message: 'clusters must be an array' });
  }

  // groupSize
  const groupSizeInt = toInt(body.groupSize);
  if (!Number.isFinite(groupSizeInt) || groupSizeInt < 0) {
    errors.push({ field: 'groupSize', message: 'groupSize must be a non-negative integer' });
  }

  // exhibits removed from feature set

  let sanitizedClusters = [];
  let selectedPointsTotal = 0;

  if (Array.isArray(body.clusters)) {
    sanitizedClusters = body.clusters.map((c, idx) => {
      const name = (c && typeof c.name === 'string') ? c.name.trim() : '';
      const points = toNumber(c && c.points);
      const selected = !!(c && c.selected);

      if (!name) {
        errors.push({ field: `clusters[${idx}].name`, message: 'name is required' });
      }
      if (!Number.isFinite(points) || points < 0) {
        errors.push({ field: `clusters[${idx}].points`, message: 'points must be a non-negative number' });
      }

      if (selected && Number.isFinite(points)) {
        selectedPointsTotal += points;
      }

      return { name, points: Number.isFinite(points) ? points : 0, selected };
    });
  }

  // Compute authoritative threshold
  const computedThreshold = Number.isFinite(groupSizeInt)
    ? groupSizeInt * selectedPointsTotal
    : NaN;

  // Threshold (client-provided) is ignored; we compute it
  if (!Number.isFinite(computedThreshold)) {
    errors.push({ field: 'threshold', message: 'threshold could not be computed from inputs' });
  }

  return {
    errors,
    sanitized: {
      clusters: sanitizedClusters,
      groupSize: groupSizeInt,
      threshold: computedThreshold,
    },
  };
}

// Get all admin portals (limited to one)
router.get('/portals', (req, res) => {
  res.json(portals.slice(0, 1));
});

// Simple login endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === adminUser.username && password === adminUser.password) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ message: 'Invalid credentials' });
});

// Add/update portal config
router.post('/portal-config', (req, res) => {
  const { errors, sanitized } = validatePortalConfig(req.body || {});

  if (errors.length) {
    return res.status(400).json({ message: 'Invalid portal config', errors });
  }

  const portal = {
    id: portals.length ? portals[0].id : nextId++,
    name: `Admin Portal ${Date.now()}`,
    ...sanitized,
  };
  // keep only one admin portal; replace if exists
  if (portals.length) {
    portals[0] = portal;
  } else {
    portals = [portal];
  }
  res.json(portal);
});

module.exports = router;
