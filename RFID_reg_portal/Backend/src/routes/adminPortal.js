const express = require('express');
const router = express.Router();
const { adminUser } = require('../adminLogin');
const {
  addPortalConfig,
  getPortals
} = require('../store/adminConfigStore');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function toInt(value) {
  const num = toNumber(value);
  return Number.isFinite(num) ? Math.trunc(num) : NaN;
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

function normalizeClusterForStore(cluster, index) {
  const name = (cluster && typeof cluster.name === 'string') ? cluster.name.trim() : '';
  const label = name || `Cluster ${index + 1}`;
  const points = toNumber(cluster && cluster.points);
  const selected = !!(cluster && cluster.selected);

  return {
    name: label,
    label,
    points: Number.isFinite(points) && points >= 0 ? points : 0,
    selected
  };
}

function validateAndNormalizeConfig(body) {
  const errors = [];

  const hasGroupSize = hasValue(body.groupSize);
  let groupSize = null;
  if (hasGroupSize) {
    const parsedGroupSize = toInt(body.groupSize);
    if (!Number.isFinite(parsedGroupSize) || parsedGroupSize < 0) {
      errors.push({ field: 'groupSize', message: 'groupSize must be a non-negative integer' });
    } else {
      groupSize = parsedGroupSize;
    }
  }

  if (!Array.isArray(body.clusters)) {
    errors.push({ field: 'clusters', message: 'clusters must be an array' });
  }

  const normalizedClusters = Array.isArray(body.clusters)
    ? body.clusters.map(normalizeClusterForStore)
    : [];

  normalizedClusters.forEach((cluster, index) => {
    if (!cluster.name) {
      errors.push({ field: `clusters[${index}].name`, message: 'name is required' });
    }
    if (!Number.isFinite(cluster.points) || cluster.points < 0) {
      errors.push({ field: `clusters[${index}].points`, message: 'points must be a non-negative number' });
    }
  });

  const selectedPointsTotal = normalizedClusters.reduce((sum, cluster) => (
    cluster.selected ? sum + (Number.isFinite(cluster.points) ? cluster.points : 0) : sum
  ), 0);

  const hasThreshold = hasValue(body.threshold);
  let threshold = null;
  if (hasThreshold) {
    const parsedThreshold = toNumber(body.threshold);
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      errors.push({ field: 'threshold', message: 'threshold must be a non-negative number' });
    } else {
      threshold = parsedThreshold;
    }
  } else if (groupSize !== null) {
    threshold = groupSize * selectedPointsTotal;
  }

  return {
    errors,
    normalized: {
      groupSize,
      threshold,
      clusters: normalizedClusters
    }
  };
}

router.get('/portals', (_req, res) => {
  res.json(getPortals());
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === adminUser.username && password === adminUser.password) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ message: 'Invalid credentials' });
});

router.post('/portal-config', (req, res) => {
  const { errors, normalized } = validateAndNormalizeConfig(req.body || {});

  if (errors.length) {
    return res.status(400).json({ message: 'Invalid portal config', errors });
  }

  try {
    const portal = addPortalConfig({
      name: `Admin Portal ${Date.now()}`,
      groupSize: normalized.groupSize,
      exhibits: normalized.groupSize,
      threshold: normalized.threshold,
      clusters: normalized.clusters,
      clusterPoints: normalized.clusters
    });

    res.json(portal);
  } catch (err) {
    console.error('[adminPortal] Failed to save config', err);
    res.status(500).json({ message: 'Failed to save config' });
  }
});

module.exports = router;
