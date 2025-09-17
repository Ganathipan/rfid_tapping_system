const express = require('express');
const router = express.Router();
const { adminUser } = require('../adminLogin');
const pool = require('../db/pool');

// ===================================================================
// GET /api/admin/config
// Get all system configuration
// ===================================================================
router.get('/config', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cluster, points, threshold, teamsize FROM system_config ORDER BY cluster'
    );
    
    // Convert to object format for easier frontend use
    const config = {};
    result.rows.forEach(row => {
      // Add cluster points
      config[`${row.cluster}_points`] = {
        value: row.points,
        description: 'cluster points'
      };
    });
    
    // Add global settings (use first row's values)
    if (result.rows.length > 0) {
      const firstRow = result.rows[0];
      config['eligibility_threshold'] = {
        value: firstRow.threshold,
        description: 'threshold'
      };
      config['max_team_size'] = {
        value: firstRow.teamsize,
        description: 'team size'
      };
    }
    
    res.json(config);
  } catch (e) {
    console.error('[admin config API error]', e);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===================================================================
// POST /api/admin/config
// Update system configuration
// ===================================================================
router.post('/config', async (req, res) => {
  const { config } = req.body || {};

  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'config object is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Extract global settings
    const threshold = config.eligibility_threshold || 50;
    const teamSize = config.max_team_size || 10;

    // Update cluster points
    for (const [key, value] of Object.entries(config)) {
      if (key.endsWith('_points') && typeof value === 'number' && value >= 0) {
        const clusterName = key.replace('_points', '');
        await client.query(
          `UPDATE system_config 
           SET points = $1, threshold = $2, teamsize = $3 
           WHERE cluster = $4`,
          [value, threshold, teamSize, clusterName]
        );
      }
    }

    // If no cluster updates were made, just update global settings for existing clusters
    if (Object.keys(config).filter(key => key.endsWith('_points')).length === 0) {
      await client.query(
        `UPDATE system_config 
         SET threshold = $1, teamsize = $2`,
        [threshold, teamSize]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[admin config API error]', e);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

// ===================================================================
// GET /api/admin/teams
// Get all teams with their scores
// ===================================================================
router.get('/teams', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id as team_id,
        r.portal,
        r.group_size,
        COALESCE(ts.points, 0) as points,
        ts.last_update,
        COUNT(m.id) as member_count
      FROM registration r
      LEFT JOIN teamscore ts ON r.id = ts.registration_id
      LEFT JOIN members m ON r.id = m.registration_id
      GROUP BY r.id, r.portal, r.group_size, ts.points, ts.last_update
      ORDER BY COALESCE(ts.points, 0) DESC, ts.last_update DESC
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('[admin teams API error]', e);
    res.status(500).json({ error: 'Database error' });
  }
});


router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === adminUser.username && password === adminUser.password) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;
