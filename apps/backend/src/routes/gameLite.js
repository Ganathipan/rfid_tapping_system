const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { getConfig, updateConfig, resetToDefault, getRule, normalizeLabel } = require('../config/gameLiteConfig');
// simple admin guard via API key
function requireAdmin(req, res, next) {
  const key = process.env.GAMELITE_ADMIN_KEY || '';
  if (!key) return res.status(403).json({ error: 'Admin key not configured' });
  const provided = req.headers['x-admin-key'];
  if (provided && provided === key) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
const { getTeamScore, redeemPoints, getTeamIdForRfid } = require('../services/gameLiteService');

// health/status for the lite manager
router.get('/status', (_req, res) => {
  const cfg = getConfig();
  res.json({ ok: true, enabled: cfg.enabled, rules: cfg.rules });
});

// get current config
router.get('/config', (_req, res) => {
  res.json(getConfig());
});

// Debug: fetch current score by RFID (team lookup)
router.get('/debug/score/:rfid', async (req, res) => {
  try {
    const { rfid } = req.params;
    const teamId = await getTeamIdForRfid(rfid);
    if (!teamId) return res.status(404).json({ error: 'RFID not in team' });
    const score = await getTeamScore(teamId);
    res.json({ teamId, score });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Debug: inspect member cluster_visits map by RFID
router.get('/debug/visits/:rfid', async (req, res) => {
  try {
    const { rfid } = req.params;
    const sql = `SELECT id as member_id, registration_id as team_id, cluster_visits FROM members WHERE rfid_card_id = $1`;
    const r = await pool.query(sql, [rfid]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'RFID not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// update config (shallow merge)
router.post('/config', requireAdmin, (req, res) => {
  const cfg = updateConfig(req.body || {});
  res.json(cfg);
});

// reset config to defaults
router.post('/config/reset', requireAdmin, (_req, res) => {
  res.json(resetToDefault());
});

// get team score by registration id
router.get('/team/:registrationId/score', async (req, res) => {
  try {
    const id = Number(req.params.registrationId);
    const score = await getTeamScore(id);
    res.json({ registrationId: id, score });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// list all team scores (for admin)
router.get('/teams/scores', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT registration_id, total_points as score FROM team_scores_lite ORDER BY registration_id DESC`);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// redemption endpoint
router.post('/redeem', requireAdmin, async (req, res) => {
  try {
    const { registrationId, clusterLabel, redeemedBy } = req.body || {};
    const rid = Number(registrationId);
    if (!rid || !clusterLabel) return res.status(400).json({ error: 'registrationId and clusterLabel required' });
    const label = normalizeLabel(clusterLabel);
    const out = await redeemPoints({ registrationId: rid, clusterLabel: label, redeemedBy });
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// eligible teams: filter by group size range and min points; include latest team location
router.get('/eligible-teams', async (_req, res) => {
  try {
    const minGroupSize = Number(getRule('minGroupSize', 1));
    const maxGroupSize = Number(getRule('maxGroupSize', 9999));
    const minPointsRequired = Number(getRule('minPointsRequired', 3));

    // Build a CTE to compute latest team location using all members' last log
    const sql = `
      WITH team_members AS (
        SELECT r.id AS registration_id, r.group_size, m.rfid_card_id
        FROM registration r
        JOIN members m ON m.registration_id = r.id
      ),
      latest_member_logs AS (
        SELECT tm.registration_id,
               l.rfid_card_id,
               l.label,
               l.log_time,
               ROW_NUMBER() OVER (PARTITION BY tm.registration_id, l.rfid_card_id ORDER BY l.log_time DESC) AS rn
        FROM team_members tm
        JOIN logs l ON l.rfid_card_id = tm.rfid_card_id
      ),
      latest_per_member AS (
        SELECT registration_id, rfid_card_id, label, log_time
        FROM latest_member_logs
        WHERE rn = 1
      ),
      team_location AS (
        SELECT registration_id,
               -- team latest is by max log_time among members; pick associated label via DISTINCT ON trick
               (SELECT lm.label
                  FROM latest_per_member lm
                 WHERE lm.registration_id = lpm.registration_id
                 ORDER BY lm.log_time DESC
                 LIMIT 1) AS latest_label,
               (SELECT MAX(lm.log_time)
                  FROM latest_per_member lm
                 WHERE lm.registration_id = lpm.registration_id) AS latest_time
        FROM latest_per_member lpm
        GROUP BY registration_id
      )
      SELECT r.id AS registration_id,
             r.group_size,
             ts.total_points AS score,
             tl.latest_label,
             tl.latest_time
      FROM registration r
      JOIN team_scores_lite ts ON ts.registration_id = r.id -- only teams with active score row
      LEFT JOIN team_location tl ON tl.registration_id = r.id
      WHERE r.group_size BETWEEN $1 AND $2
        AND ts.total_points >= $3
      ORDER BY ts.total_points DESC, r.id DESC;
    `;

    const { rows } = await pool.query(sql, [minGroupSize, maxGroupSize, minPointsRequired]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Leaderboard: top N teams by score
router.get('/leaderboard', async (req, res) => {
  try {
    const lim = Math.max(1, Math.min(1000, Number(req.query.limit) || 10));
    const r = await pool.query(
      `SELECT registration_id, total_points as score
         FROM team_scores_lite
        ORDER BY total_points DESC, registration_id DESC
        LIMIT $1`,
      [lim]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Test endpoint for comprehensive system testing with hex RFID format
router.get('/test-scoring', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, warnings: 0 }
  };

  // Helper function to add test result
  const addTest = (name, status, message, data = null) => {
    results.tests.push({ name, status, message, data });
    if (status === 'PASS') results.summary.passed++;
    else if (status === 'FAIL') results.summary.failed++;
    else if (status === 'WARN') results.summary.warnings++;
  };

  try {
    // Test 1: Check game configuration
    addTest('Configuration Check', 'INFO', 'Checking game configuration...');
    const config = getConfig();
    if (config.enabled) {
      addTest('Game Status', 'PASS', 'Game is enabled', { enabled: config.enabled });
    } else {
      addTest('Game Status', 'FAIL', 'Game is disabled - enable in config', { enabled: config.enabled });
    }

    const clusterRules = config.rules?.clusterRules || {};
    const clusterCount = Object.keys(clusterRules).length;
    if (clusterCount > 0) {
      addTest('Cluster Rules', 'PASS', `${clusterCount} cluster rules configured`, { 
        clusters: Object.keys(clusterRules),
        rules: clusterRules 
      });
    } else {
      addTest('Cluster Rules', 'FAIL', 'No cluster rules configured');
    }

    // Test 2: Database connectivity
    addTest('Database Check', 'INFO', 'Testing database connectivity...');
    try {
      const dbTest = await pool.query('SELECT 1 as test');
      if (dbTest.rowCount > 0) {
        addTest('Database Connection', 'PASS', 'Database is accessible');
      } else {
        addTest('Database Connection', 'FAIL', 'Database query returned no results');
      }
    } catch (dbError) {
      addTest('Database Connection', 'FAIL', `Database error: ${dbError.message}`);
    }

    // Test 3: Check for teams with hex RFID cards
    addTest('Team Data Check', 'INFO', 'Checking for registered teams with hex RFID cards...');
    try {
      const teamsQuery = await pool.query(`
        SELECT r.id as registration_id, r.group_size, 
               COUNT(m.id) as member_count,
               STRING_AGG(m.rfid_card_id, ', ') as rfid_cards
        FROM registration r 
        LEFT JOIN members m ON m.registration_id = r.id 
        WHERE m.rfid_card_id ~ '^[0-9A-F]{8}$'
        GROUP BY r.id, r.group_size 
        LIMIT 5
      `);
      
      if (teamsQuery.rowCount > 0) {
        addTest('Teams with Hex RFID', 'PASS', `Found ${teamsQuery.rowCount} teams with hex RFID cards`, {
          count: teamsQuery.rowCount,
          samples: teamsQuery.rows
        });
      } else {
        addTest('Teams with Hex RFID', 'WARN', 'No teams found with hex RFID cards (A1B2C3D4 format)');
      }
    } catch (teamError) {
      addTest('Teams with Hex RFID', 'FAIL', `Team query error: ${teamError.message}`);
    }

    // Test 4: Check team scores
    addTest('Scoring Check', 'INFO', 'Checking team scoring system...');
    try {
      const scoresQuery = await pool.query(`
        SELECT registration_id, total_points 
        FROM team_scores_lite 
        ORDER BY total_points DESC 
        LIMIT 10
      `);
      
      if (scoresQuery.rowCount > 0) {
        const totalTeamsWithScores = scoresQuery.rowCount;
        const topScore = scoresQuery.rows[0].total_points;
        addTest('Team Scores', 'PASS', `${totalTeamsWithScores} teams have scores, top score: ${topScore}`, {
          count: totalTeamsWithScores,
          topScores: scoresQuery.rows
        });
      } else {
        addTest('Team Scores', 'WARN', 'No teams have scores yet - simulate RFID taps to generate scores');
      }
    } catch (scoreError) {
      addTest('Team Scores', 'FAIL', `Score query error: ${scoreError.message}`);
    }

    // Test 5: Test hex RFID format validation
    addTest('Hex RFID Validation', 'INFO', 'Testing hex RFID format validation...');
    const testRfids = ['A1B2C3D4', 'E5F6A7B8', 'invalid', '12345', 'GHIJKLMN'];
    const hexPattern = /^[0-9A-F]{8}$/;
    
    let validHexCount = 0;
    const validationResults = testRfids.map(rfid => {
      const isValid = hexPattern.test(rfid);
      if (isValid) validHexCount++;
      return { rfid, valid: isValid };
    });
    
    addTest('Hex Format Validation', 'PASS', `${validHexCount}/${testRfids.length} test RFIDs passed validation`, {
      results: validationResults
    });

    // Test 6: Simulate RFID tap if we have test data
    addTest('RFID Simulation', 'INFO', 'Testing RFID tap simulation...');
    try {
      // Look for a test RFID card in hex format
      const testRfidQuery = await pool.query(`
        SELECT m.rfid_card_id, m.registration_id 
        FROM members m 
        WHERE m.rfid_card_id ~ '^[0-9A-F]{8}$' 
        LIMIT 1
      `);
      
      if (testRfidQuery.rowCount > 0) {
        const testRfid = testRfidQuery.rows[0].rfid_card_id;
        const teamId = testRfidQuery.rows[0].registration_id;
        
        // Get current score before simulation
        const scoreBefore = await getTeamScore(teamId);
        
        addTest('RFID Tap Simulation', 'PASS', `Simulation ready with RFID: ${testRfid}`, {
          testRfid,
          teamId,
          currentScore: scoreBefore,
          note: 'Use POST /api/tags/rfidRead with reader=CLUSTER1, portal=reader1, tag=' + testRfid
        });
      } else {
        addTest('RFID Tap Simulation', 'WARN', 'No hex RFID cards available for simulation testing');
      }
    } catch (simError) {
      addTest('RFID Tap Simulation', 'FAIL', `Simulation test error: ${simError.message}`);
    }

    // Test 7: Check required tables exist
    addTest('Schema Check', 'INFO', 'Verifying required database tables...');
    try {
      const tableChecks = [
        'registration',
        'members', 
        'team_scores_lite',
        'logs',
        'rfid_cards'
      ];
      
      const schemaResults = [];
      for (const table of tableChecks) {
        try {
          const tableQuery = await pool.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
          schemaResults.push({ table, exists: true, count: parseInt(tableQuery.rows[0].count) });
        } catch (tableError) {
          schemaResults.push({ table, exists: false, error: tableError.message });
        }
      }
      
      const existingTables = schemaResults.filter(t => t.exists).length;
      if (existingTables === tableChecks.length) {
        addTest('Schema Validation', 'PASS', `All ${existingTables} required tables exist`, { tables: schemaResults });
      } else {
        addTest('Schema Validation', 'FAIL', `Only ${existingTables}/${tableChecks.length} required tables exist`, { tables: schemaResults });
      }
    } catch (schemaError) {
      addTest('Schema Validation', 'FAIL', `Schema check error: ${schemaError.message}`);
    }

  } catch (error) {
    addTest('Test Framework', 'FAIL', `Test execution error: ${error.message}`);
  }

  // Add troubleshooting guide
  results.troubleshooting = {
    checklist: [
      '✅ Backend server running? (cd apps/backend && npm run dev)',
      '❓ Database connected? (PostgreSQL with "rfid" database)',
      '❓ MQTT broker running? (for real RFID hardware)',
      '❓ Teams registered with members and hex RFID cards?',
      '❓ RFID card IDs in hex format (e.g., A1B2C3D4, E5F6A7B8)?'
    ],
    nextSteps: [
      'If game is disabled: Enable in apps/backend/config/game-lite.config.json',
      'If no teams: Register teams with hex RFID cards using the registration system',
      'If no scores: Simulate RFID taps using POST /api/tags/rfidRead',
      'Check cluster configuration in game-lite.config.json for proper point values'
    ]
  };

  res.json(results);
});

module.exports = router;

// Admin-only convenience: initialize schema (no-op now that schema.sql owns DDL)
router.post('/admin/init', requireAdmin, async (_req, res) => {
  res.json({ ok: true, message: 'Schema managed via Database/schema.sql' });
});
