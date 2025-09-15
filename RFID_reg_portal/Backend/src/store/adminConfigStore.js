const portals = [];
let nextId = 1;
let lastPortalConfig = null;

function normalizeClusterKey(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeClusterEntry(entry, index = 0) {
  if (entry == null) return null;

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const [rawLabel, rawPoints] = parts;
      const label = rawLabel.trim();
      const points = Number(rawPoints.trim());
      if (!label || !Number.isFinite(points)) return null;
      return {
        label,
        key: normalizeClusterKey(label),
        points
      };
    }

    const label = trimmed;
    return {
      label,
      key: normalizeClusterKey(label),
      points: 1
    };
  }

  if (typeof entry === 'object') {
    const label = String(
      entry.label ??
      entry.name ??
      entry.id ??
      entry.cluster ??
      entry.clusterId ??
      ''
    ).trim();

    if (!label) return null;

    const points = Number(
      entry.points ??
      entry.value ??
      entry.weight ??
      entry.score ??
      entry.pointsPerVisit
    );

    if (!Number.isFinite(points)) return null;

    return {
      label,
      key: normalizeClusterKey(label),
      points
    };
  }

  return null;
}

function parseClusterPoints(rawClusters) {
  if (!rawClusters) return [];

  if (Array.isArray(rawClusters)) {
    return rawClusters
      .map((entry, index) => normalizeClusterEntry(entry, index))
      .filter(Boolean);
  }

  if (typeof rawClusters === 'string') {
    const trimmed = rawClusters.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseClusterPoints(parsed);
      } catch (err) {
        return [];
      }
    }

    return trimmed
      .split(',')
      .map(part => normalizeClusterEntry(part))
      .filter(Boolean);
  }

  if (typeof rawClusters === 'object') {
    if (Array.isArray(rawClusters.clusterPoints)) {
      return parseClusterPoints(rawClusters.clusterPoints);
    }

    return Object.entries(rawClusters)
      .map(([label, points]) => normalizeClusterEntry({ label, points }))
      .filter(Boolean);
  }

  return [];
}

function clonePortal(portal) {
  if (!portal) return null;
  return {
    ...portal,
    clusterPoints: portal.clusterPoints.map(entry => ({ ...entry }))
  };
}

function addPortalConfig(rawConfig = {}) {
  const {
    name,
    exhibits,
    threshold,
    clusterPoints
  } = normalizePortalConfig(rawConfig);

  const portal = {
    id: nextId++,
    name,
    exhibits,
    threshold,
    clusters: clusterPoints.length,
    clusterPoints,
    createdAt: new Date().toISOString()
  };

  portals.push(portal);
  lastPortalConfig = portal;
  return clonePortal(portal);
}

function normalizePortalConfig(rawConfig) {
  const clusterPoints = parseClusterPoints(rawConfig.clusterPoints ?? rawConfig.clusters);
  const exhibits = toNumber(rawConfig.exhibits, 0);
  const threshold = toNumber(rawConfig.threshold, 0);
  const name = rawConfig.name ? String(rawConfig.name) : `Admin Portal ${Date.now()}`;

  return {
    name,
    exhibits,
    threshold,
    clusterPoints
  };
}

function getPortals() {
  return portals.map(portal => clonePortal(portal));
}

function getLatestPortalConfig() {
  return clonePortal(lastPortalConfig);
}

module.exports = {
  addPortalConfig,
  getPortals,
  getLatestPortalConfig,
  normalizeClusterKey
};
