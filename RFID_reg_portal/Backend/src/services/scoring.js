const {
  getLatestPortalConfig,
  normalizeClusterKey
} = require('../store/adminConfigStore');

function buildClusterPointsMap(entries) {
  const map = new Map();

  for (const entry of entries) {
    if (!entry) continue;
    const keySource = entry.key ? entry.key : entry.label ?? entry.name;
    const key = normalizeClusterKey(keySource);
    const points = Number(entry.points);

    if (!key || !Number.isFinite(points)) continue;
    map.set(key, points);
  }

  return map;
}

function selectClusterEntries(activeConfig) {
  if (!activeConfig) return [];

  const fromClusterPoints = Array.isArray(activeConfig.clusterPoints)
    ? activeConfig.clusterPoints.filter(Boolean)
    : [];

  if (fromClusterPoints.length > 0) {
    return fromClusterPoints;
  }

  if (Array.isArray(activeConfig.clusters)) {
    return activeConfig.clusters
      .filter(entry => entry && entry.selected !== false)
      .map(entry => ({
        label: entry.label ?? entry.name ?? entry.cluster,
        points: entry.points
      }));
  }

  return [];
}

function getWeightedClusterScore(labels = []) {
  const activeConfig = getLatestPortalConfig();
  const threshold = Number(activeConfig?.threshold);
  const normalizedThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 3;

  const clusterEntries = selectClusterEntries(activeConfig);
  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));

  if (clusterEntries.length === 0) {
    const points = uniqueLabels.length;
    const breakdown = uniqueLabels.map(label => ({ label, points: 1, source: 'default' }));
    return { points, breakdown, threshold: normalizedThreshold, configApplied: false };
  }

  const clusterPointsMap = buildClusterPointsMap(clusterEntries);
  let points = 0;
  const breakdown = [];

  for (const label of uniqueLabels) {
    const key = normalizeClusterKey(label);
    if (clusterPointsMap.has(key)) {
      const clusterPoints = clusterPointsMap.get(key);
      points += clusterPoints;
      breakdown.push({ label, points: clusterPoints, source: 'weighted' });
    } else {
      points += 1;
      breakdown.push({ label, points: 1, source: 'default' });
    }
  }

  return {
    points,
    breakdown,
    threshold: normalizedThreshold,
    configApplied: clusterPointsMap.size > 0
  };
}

module.exports = {
  getWeightedClusterScore
};
