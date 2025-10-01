const pool = require('../db/pool');
const { getConfig } = require('../config/gameLiteConfig');

/**
 * Helper: parse ISO or epoch string to Date; returns null if invalid.
 */
function parseDate(v) {
  if (!v) return null;
  if (/^\d+$/.test(String(v))) {
    const d = new Date(Number(v));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Build cluster occupancy CTE reused in live and range queries */
function buildClusterOccupancyCTE(timeFilterClause) {
  return `latest_logs AS (
    SELECT DISTINCT ON (rfid_card_id)
      rfid_card_id,
      label,
      log_time,
      portal
    FROM logs
    WHERE (label ILIKE 'CLUSTER%' OR label ILIKE 'Z%' OR label IN ('EXITOUT','REGISTER'))
      ${timeFilterClause}
    ORDER BY rfid_card_id, log_time DESC
  )`;
}

/** Extract zone number from label */
function extractZone(label) {
  if (!label) return null;
  let match = label.match(/CLUSTER(\d+)/i) || label.match(/Z(\d+)/i);
  if (!match) return null;
  const zoneId = Number(match[1]);
  if (zoneId >= 1 && zoneId <= 64) { // allow future growth
    return { id: zoneId, zone: `zone${zoneId}` };
  }
  return null;
}

// GET /api/analytics/live
// Returns instant metrics based on most recent log per card in last 24h
async function getLiveAnalytics(req, res) {
  try {
    const nowWindowHours = Number(req.query.window_hours || 24);
    const hours = Math.min(Math.max(nowWindowHours, 1), 72); // clamp 1..72

    const cte = buildClusterOccupancyCTE(`AND log_time > NOW() - INTERVAL '${hours} hours'`);

    // single round trip computing:
    // - latest per card (cte)
    // - active cards (not EXITOUT)
    // - cluster occupancy
    // - venue totals REGISTER vs EXITOUT
    // - total unique cards (distinct rfid in window)
    // - average session duration for completed sessions (REGISTER..EXITOUT)
    // - average active session age for currently active
    const sql = `WITH ${cte},
      register_exit AS (
        SELECT DISTINCT ON (rfid_card_id) rfid_card_id, label, log_time
        FROM logs
        WHERE label IN ('REGISTER','EXITOUT')
          AND log_time > NOW() - INTERVAL '${hours} hours'
        ORDER BY rfid_card_id, log_time DESC
      ),
      sessions AS (
        -- Completed sessions
        SELECT rfid_card_id,
               MIN(CASE WHEN label='REGISTER' THEN log_time END) AS registered_at,
               MAX(CASE WHEN label='EXITOUT' THEN log_time END) AS exited_at
        FROM logs
        WHERE label IN ('REGISTER','EXITOUT')
          AND log_time > NOW() - INTERVAL '${hours} hours'
        GROUP BY rfid_card_id
      )
      SELECT 
        (SELECT COUNT(*) FROM latest_logs WHERE label NOT IN ('EXITOUT')) AS active_cards,
        (SELECT COUNT(DISTINCT rfid_card_id) FROM logs WHERE log_time > NOW() - INTERVAL '${hours} hours') AS total_unique_cards,
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (exited_at - registered_at))),0) FROM sessions WHERE exited_at IS NOT NULL AND registered_at IS NOT NULL AND exited_at > registered_at) AS avg_session_duration_secs,
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - registered_at))),0) FROM sessions WHERE exited_at IS NULL AND registered_at IS NOT NULL) AS avg_active_session_age_secs,
        (SELECT SUM(CASE WHEN label='REGISTER' THEN 1 ELSE 0 END) FROM register_exit WHERE label='REGISTER') AS latest_register_events,
        (SELECT SUM(CASE WHEN label='EXITOUT' THEN 1 ELSE 0 END) FROM register_exit WHERE label='EXITOUT') AS latest_exit_events
    `;

    const result = await pool.query(sql);
    const row = result.rows[0] || {};

    // cluster breakdown (need second query using same CTE to map labels)
    const clustersSql = `WITH ${cte}
      SELECT label, COUNT(*) AS visitor_count
      FROM latest_logs
      WHERE label NOT IN ('EXITOUT','REGISTER') AND (label ILIKE 'CLUSTER%' OR label ILIKE 'Z%')
      GROUP BY label
      ORDER BY label`;
    const clustersRes = await pool.query(clustersSql);
    const clusterMap = new Map();
    clustersRes.rows.forEach(r => {
      const z = extractZone(r.label);
      if (z) clusterMap.set(z.id, { id: z.id, zone: z.zone, visitors: Number(r.visitor_count) });
    });
    // Dynamically include configured clusters (GameLite) + reader_config mapping
    const cfg = getConfig();
    const configuredLabels = new Set(Object.keys(cfg.rules?.clusterRules || {}));
    // Fallback: if clusterRules empty, attempt to infer from rules root (legacy)
    if (configuredLabels.size === 0 && cfg.rules) {
      const reserved = new Set(['eligibleLabelPrefix','pointsPerMemberFirstVisit','pointsPerMemberRepeatVisit','awardOnlyFirstVisit','minGroupSize','maxGroupSize','minPointsRequired','clusterRules']);
      Object.keys(cfg.rules).forEach(k=>{ if(!reserved.has(k) && /CLUSTER\d+/i.test(k)) configuredLabels.add(k.toUpperCase()); });
    }
    // Also gather any CLUSTERn labels present in reader_config table
    try {
      const rc = await pool.query('SELECT DISTINCT reader_id FROM reader_config WHERE reader_id ILIKE \n \'CLUSTER%\'');
      rc.rows.forEach(r=>{ if(r.reader_id) configuredLabels.add(String(r.reader_id).trim().toUpperCase()); });
    } catch(_) {}
    // Build unified list of zone indices from configured labels + observed (limit growth to 64)
    const extraZoneIds = new Set();
    configuredLabels.forEach(lbl=>{ const z = extractZone(lbl); if (z && z.id <=64) extraZoneIds.add(z.id); });
  // Always include baseline first 4 zones for stability; expand dynamically
  for (let base=1;base<=4;base++) extraZoneIds.add(base);
    const allZoneIds = Array.from(extraZoneIds).sort((a,b)=>a-b);
    const zones = allZoneIds.map(id => clusterMap.get(id) || { id, zone: `zone${id}`, visitors: 0 });

    const venueTotal = Math.max(0, Number(row.active_cards || 0));
    res.json({
      mode: 'live',
      window_hours: hours,
      generated_at: new Date().toISOString(),
      venue_total: venueTotal,
      active_cards: Number(row.active_cards || 0),
      total_unique_cards: Number(row.total_unique_cards || 0),
      average_session_duration_secs: Number(row.avg_session_duration_secs || 0),
      average_active_session_age_secs: Number(row.avg_active_session_age_secs || 0),
      clusters: zones
    });
  } catch (err) {
    console.error('[analytics.live] error', err);
    res.status(500).json({ error: 'failed to compute live analytics' });
  }
}

// GET /api/analytics/range?from=ISO&to=ISO
// Computes metrics for a fixed time range.
async function getRangeAnalytics(req, res) {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (!from || !to || from >= to) {
      return res.status(400).json({ error: 'invalid from/to range' });
    }

    // Parameterized to avoid injection
    const params = [from.toISOString(), to.toISOString()];

    // Completed and active sessions within range boundaries:
    // A session counts if it overlaps the interval.
    const sql = `WITH range_logs AS (
        SELECT * FROM logs WHERE log_time BETWEEN $1 AND $2
      ),
      latest_logs AS (
        SELECT DISTINCT ON (rfid_card_id) rfid_card_id, label, log_time
        FROM range_logs
        WHERE label IN ('REGISTER','EXITOUT','CLUSTER1','CLUSTER2','CLUSTER3','CLUSTER4','CLUSTER5','CLUSTER6','CLUSTER7','CLUSTER8') OR label ILIKE 'CLUSTER%' OR label ILIKE 'Z%'
        ORDER BY rfid_card_id, log_time DESC
      ),
      sessions AS (
        SELECT rfid_card_id,
          MIN(CASE WHEN label='REGISTER' THEN log_time END) AS registered_at,
          MAX(CASE WHEN label='EXITOUT' THEN log_time END) AS exited_at
        FROM range_logs
        WHERE label IN ('REGISTER','EXITOUT')
        GROUP BY rfid_card_id
      )
      SELECT 
        (SELECT COUNT(DISTINCT rfid_card_id) FROM range_logs) AS total_unique_cards,
        (SELECT COUNT(*) FROM latest_logs WHERE label NOT IN ('EXITOUT')) AS active_cards,
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (exited_at - registered_at))),0) FROM sessions WHERE exited_at IS NOT NULL AND registered_at IS NOT NULL AND exited_at > registered_at) AS avg_session_duration_secs,
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ($2::timestamptz - registered_at))),0) FROM sessions WHERE exited_at IS NULL AND registered_at IS NOT NULL) AS avg_active_session_age_secs`;

    const result = await pool.query(sql, params);
    const row = result.rows[0] || {};

    // cluster distribution within range based on last state per card (range only)
    const clustersSql = `WITH range_logs AS (
        SELECT * FROM logs WHERE log_time BETWEEN $1 AND $2
      ), latest_logs AS (
        SELECT DISTINCT ON (rfid_card_id) rfid_card_id, label, log_time
        FROM range_logs
        WHERE (label ILIKE 'CLUSTER%' OR label ILIKE 'Z%')
        ORDER BY rfid_card_id, log_time DESC
      )
      SELECT label, COUNT(*) AS visitor_count
      FROM latest_logs
      WHERE label NOT IN ('EXITOUT','REGISTER')
      GROUP BY label
      ORDER BY label`;
    const clustersRes = await pool.query(clustersSql, params);
    const clusterMap = new Map();
    clustersRes.rows.forEach(r => {
      const z = extractZone(r.label);
      if (z) clusterMap.set(z.id, { id: z.id, zone: z.zone, visitors: Number(r.visitor_count) });
    });
    // Dynamic zone inclusion (same logic as live)
    const cfg = getConfig();
    const configuredLabels = new Set(Object.keys(cfg.rules?.clusterRules || {}));
    if (configuredLabels.size === 0 && cfg.rules) {
      const reserved = new Set(['eligibleLabelPrefix','pointsPerMemberFirstVisit','pointsPerMemberRepeatVisit','awardOnlyFirstVisit','minGroupSize','maxGroupSize','minPointsRequired','clusterRules']);
      Object.keys(cfg.rules).forEach(k=>{ if(!reserved.has(k) && /CLUSTER\d+/i.test(k)) configuredLabels.add(k.toUpperCase()); });
    }
    try {
      const rc = await pool.query('SELECT DISTINCT reader_id FROM reader_config WHERE reader_id ILIKE \n \'CLUSTER%\'');
      rc.rows.forEach(r=>{ if(r.reader_id) configuredLabels.add(String(r.reader_id).trim().toUpperCase()); });
    } catch(_) {}
    const extraZoneIds = new Set();
    configuredLabels.forEach(lbl=>{ const z = extractZone(lbl); if (z && z.id <=64) extraZoneIds.add(z.id); });
  for (let base=1;base<=4;base++) extraZoneIds.add(base);
    const allZoneIds = Array.from(extraZoneIds).sort((a,b)=>a-b);
    const zones = allZoneIds.map(id => clusterMap.get(id) || { id, zone: `zone${id}`, visitors: 0 });

    res.json({
      mode: 'range',
      from: from.toISOString(),
      to: to.toISOString(),
      generated_at: new Date().toISOString(),
      venue_total: Number(row.active_cards || 0),
      active_cards: Number(row.active_cards || 0),
      total_unique_cards: Number(row.total_unique_cards || 0),
      average_session_duration_secs: Number(row.avg_session_duration_secs || 0),
      average_active_session_age_secs: Number(row.avg_active_session_age_secs || 0),
      clusters: zones
    });
  } catch (err) {
    console.error('[analytics.range] error', err);
    res.status(500).json({ error: 'failed to compute range analytics' });
  }
}

module.exports = { getLiveAnalytics, getRangeAnalytics };
