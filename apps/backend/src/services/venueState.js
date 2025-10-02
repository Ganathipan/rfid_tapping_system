// In-memory crowd counters (reset on process restart)
let currentCrowd = 0;

function getCurrentCrowd() {
  return currentCrowd;
}

function adjustCrowd(delta = 0) {
  const d = Number(delta || 0);
  if (!Number.isFinite(d)) return currentCrowd;
  currentCrowd = Math.max(0, currentCrowd + d);
  return currentCrowd;
}

function incCrowd(delta = 1) { return adjustCrowd(Math.max(0, Number(delta || 0))); }
function decCrowd(delta = 1) { return adjustCrowd(-Math.max(0, Number(delta || 0))); }

module.exports = { getCurrentCrowd, incCrowd, decCrowd, adjustCrowd };
