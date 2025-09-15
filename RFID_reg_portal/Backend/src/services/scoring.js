const {
  getLatestPortalConfig,
  normalizeClusterKey
} = require('../store/adminConfigStore');

function buildClusterPointsMap(clusterPointsConfig) {
  const map = new Map();

  for (const entry of clusterPointsConfig) {
    if (!entry) continue;
    const keySource = entry.key ? entry.key : entry.label;
    const key = normalizeClusterKey(keySource);
    const points = Number(entry.points);

    if (!key || !Number.isFinite(points)) continue;
    map.set(key, points);
  }

  return map;
}

function getWeightedClusterScore(labels = []) {
  const activeConfig = getLatestPortalConfig();
  const threshold = Number(activeConfig?.threshold) || 3;
  const clusterPointsConfig = Array.isArray(activeConfig?.clusterPoints)
    ? activeConfig.clusterPoints
    : [];

  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));

  if (clusterPointsConfig.length === 0) {
    const points = uniqueLabels.length;
    const breakdown = uniqueLabels.map(label => ({ label, points: 1, source: 'default' }));
    return { points, breakdown, threshold, configApplied: false };
  }

  const clusterPointsMap = buildClusterPointsMap(clusterPointsConfig);
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
    threshold,
    configApplied: clusterPointsMap.size > 0
  };
}

module.exports = {
  getWeightedClusterScore
};
