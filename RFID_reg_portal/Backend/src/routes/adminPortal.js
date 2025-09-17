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
  const minTeamSize = toInt(cluster && cluster.minTeamSize);
  const maxTeamSize = toInt(cluster && cluster.maxTeamSize);
  const deviceId = cluster && cluster.deviceId ? String(cluster.deviceId) : null;

  return {
    name: label,
    label,
    points: Number.isFinite(points) && points >= 0 ? points : 0,
    selected,
    minTeamSize: Number.isFinite(minTeamSize) && minTeamSize > 0 ? minTeamSize : 1,
    maxTeamSize: Number.isFinite(maxTeamSize) && maxTeamSize > 0 ? maxTeamSize : 10,
    deviceId
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
    if (!Number.isFinite(cluster.minTeamSize) || cluster.minTeamSize < 1) {
      errors.push({ field: `clusters[${index}].minTeamSize`, message: 'minTeamSize must be >= 1' });
    }
    if (!Number.isFinite(cluster.maxTeamSize) || cluster.maxTeamSize < cluster.minTeamSize) {
      errors.push({ field: `clusters[${index}].maxTeamSize`, message: 'maxTeamSize must be >= minTeamSize' });
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

router.post('/portal-config', async (req, res) => {
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

    // Store cluster config in DB
    const pool = require('../db/pool');
    for (const cluster of normalized.clusters) {
      await pool.query(
        `INSERT INTO cluster_config (cluster_code, min_team_size, max_team_size, points, device_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cluster_code) DO UPDATE SET min_team_size = $2, max_team_size = $3, points = $4, device_id = $5`,
        [cluster.label, cluster.minTeamSize, cluster.maxTeamSize, cluster.points, cluster.deviceId]
      );
    }

    res.json(portal);
  } catch (err) {
    console.error('[adminPortal] Failed to save config', err);
    res.status(500).json({ message: 'Failed to save config' });
  }
});

module.exports = router;
