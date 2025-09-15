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

  if (typeof entry === 'object') {
    if (Object.prototype.hasOwnProperty.call(entry, 'selected') && entry.selected === false) {
      return null;
    }
  }

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
      `Cluster ${index + 1}`
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

function buildClusterList(rawClusters, clusterPoints) {
  if (Array.isArray(rawClusters)) {
    const pointsLookup = new Map(clusterPoints.map(entry => [entry.key, entry.points]));

    return rawClusters.map((entry, index) => {
      const name = String(
        entry?.name ??
        entry?.label ??
        entry?.cluster ??
        `Cluster ${index + 1}`
      ).trim() || `Cluster ${index + 1}`;

      const key = normalizeClusterKey(name);
      const points = Number(
        entry?.points ??
        entry?.value ??
        entry?.weight ??
        entry?.score ??
        pointsLookup.get(key)
      );

      const hasExplicitSelection = Object.prototype.hasOwnProperty.call(entry, 'selected');
      const selected = hasExplicitSelection ? Boolean(entry.selected) : pointsLookup.has(key);

      return {
        name,
        label: name,
        points: Number.isFinite(points) ? points : 0,
        selected
      };
    });
  }

  return clusterPoints.map((entry, index) => ({
    name: entry.label || `Cluster ${index + 1}`,
    label: entry.label || `Cluster ${index + 1}`,
    points: entry.points,
    selected: true
  }));
}

function clonePortal(portal) {
  if (!portal) return null;
  return {
    ...portal,
    clusterPoints: portal.clusterPoints.map(entry => ({ ...entry })),
    clusters: Array.isArray(portal.clusters)
      ? portal.clusters.map(entry => ({ ...entry }))
      : portal.clusters
  };
}

function addPortalConfig(rawConfig = {}) {
  const {
    name,
    exhibits,
    groupSize,
    threshold,
    clusterPoints,
    clusters
  } = normalizePortalConfig(rawConfig);

  const portal = {
    id: nextId++,
    name,
    exhibits,
    groupSize,
    threshold,
    clusterCount: clusterPoints.length,
    clusters,
    clusterPoints,
    createdAt: new Date().toISOString()
  };

  portals.push(portal);
  lastPortalConfig = portal;
  return clonePortal(portal);
}

function normalizePortalConfig(rawConfig) {
  const rawClustersInput = rawConfig.clusterPoints ?? rawConfig.clusters;
  const clusterPoints = parseClusterPoints(rawClustersInput);
  const exhibits = toNumber(rawConfig.exhibits ?? rawConfig.groupSize, 0);
  const groupSize = toNumber(rawConfig.groupSize ?? rawConfig.exhibits, exhibits);
  const threshold = toNumber(rawConfig.threshold, 0);
  const name = rawConfig.name ? String(rawConfig.name) : `Admin Portal ${Date.now()}`;
  const clusters = buildClusterList(rawClustersInput, clusterPoints);

  return {
    name,
    exhibits,
    groupSize,
    threshold,
    clusterPoints,
    clusters
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
