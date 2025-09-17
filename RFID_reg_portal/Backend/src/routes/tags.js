const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
// Removed old scoring imports

// Import RFID hardware router
const rfidHardwareRouter = require('./rfidHardware');
router.use(rfidHardwareRouter);

// ===================================================================
// GET /api/tags/status/:rfid
// Returns team score and eligibility for game
// ===================================================================
router.get('/status/:rfid', async (req, res) => {
  const { rfid } = req.params;

  try {
    // Get team information for this RFID
    const teamResult = await pool.query(
      `SELECT registration_id FROM members WHERE rfid_card_id = $1`,
      [rfid]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'RFID not assigned to any team' });
    }

    const teamId = teamResult.rows[0].registration_id;

    // Get team score
    const scoreResult = await pool.query(
      `SELECT points FROM teamscore WHERE registration_id = $1`,
      [teamId]
    );

    const points = scoreResult.rows.length > 0 ? scoreResult.rows[0].points : 0;

    // Get eligibility threshold and max team size
    const configResult = await pool.query(
      `SELECT threshold, teamsize FROM system_config LIMIT 1`
    );

    const threshold = configResult.rows.length > 0 ? configResult.rows[0].threshold : 50;
    const maxTeamSize = configResult.rows.length > 0 ? configResult.rows[0].teamsize : 10;

    // Check eligibility: if max_team_size is set (>0), use it; otherwise use threshold
    let eligible = false;
    if (maxTeamSize > 0) {
      // Use team size for eligibility
      const teamSizeResult = await pool.query(
        `SELECT COUNT(*) as team_size FROM members WHERE registration_id = $1`,
        [teamId]
      );
      const teamSize = parseInt(teamSizeResult.rows[0].team_size);
      eligible = teamSize >= maxTeamSize;
    } else {
      // Use points threshold for eligibility
      eligible = points >= threshold;
    }

    // Get team size for response
    const teamSizeResult = await pool.query(
      `SELECT COUNT(*) as team_size FROM members WHERE registration_id = $1`,
      [teamId]
    );
    const teamSize = parseInt(teamSizeResult.rows[0].team_size);

    res.status(200).json({ 
      rfid, 
      teamId, 
      points, 
      threshold, 
      maxTeamSize,
      teamSize,
      eligible 
    });
  } catch (e) {
    console.error('[status API error]', e);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;

// ===================================================================
// GET /api/admin/registrations
// Returns all registration records for admin portal
// ===================================================================
router.get('/admin/registrations', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registration ORDER BY id DESC');
    res.status(200).json(result.rows);
  } catch (e) {
    return handleError(res, e);
  }
});

// ===================================================================
// POST /api/tags/link
// Link last REGISTERed card at a portal to a registration as LEADER/MEMBER
// Body: { portal: string, leaderId: number, asLeader?: boolean }
// ===================================================================
router.post('/link', async (req, res) => {
  const { portal, leaderId, asLeader } = req.body || {};
  if (!portal) return badReq(res, 'Portal is required');
  if (!leaderId || isNaN(leaderId)) return badReq(res, 'leaderId is required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get last REGISTER tap for this portal and ensure card is available
    const tagId = await getLastRegisterLogAvailableTag(portal);

    if (asLeader) {
      await assignTagToLeader(client, tagId, leaderId, portal);
    } else {
      await assignTagToMember(client, tagId, leaderId, portal);
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, tagId, role: asLeader ? 'LEADER' : 'MEMBER' });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return handleError(res, e);
  } finally {
    client.release();
  }
});

// ===================================================================
// POST /api/tags/tap
// Record a tap and update team scoring
// ===================================================================
router.post('/tap', async (req, res) => {
  const { rfid, portal } = req.body;

  if (!rfid || !portal) {
    return res.status(400).json({ error: 'rfid and portal are required' });
  }

  // Auto-determine cluster based on portal (e.g., reader1, reader1a, reader1b -> cluster1)
  let cluster = portal.replace('reader', 'cluster').toLowerCase();
  
  // Handle multiple readers per cluster (reader1a, reader1b -> cluster1)
  if (cluster.includes('a') || cluster.includes('b')) {
    cluster = cluster.replace(/[ab]$/, '');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID is assigned to a team
    const teamResult = await client.query(
      `SELECT registration_id FROM members WHERE rfid_card_id = $1`,
      [rfid]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'RFID not assigned to any team' });
    }

    const teamId = teamResult.rows[0].registration_id;

    // Check if this member has already tapped this cluster
    const existingTap = await client.query(
      `SELECT 1 FROM logs 
       WHERE rfid_card_id = $1 AND label = $2 AND portal = $3`,
      [rfid, cluster, portal]
    );

    if (existingTap.rows.length > 0) {
      return res.status(409).json({ error: 'Member has already tapped this cluster' });
    }

    // Record the tap
    await client.query(
      `INSERT INTO logs (rfid_card_id, portal, label, log_time)
       VALUES ($1, $2, $3, NOW())`,
      [rfid, cluster, portal]
    );

    // Get cluster points from system config
    const configResult = await client.query(
      `SELECT points FROM system_config WHERE cluster = $1`,
      [cluster]
    );

    const clusterPoints = configResult.rows.length > 0 ? configResult.rows[0].points : 0;

    // Update team score
    await client.query(
      `INSERT INTO teamscore (registration_id, points, last_update)
       VALUES ($1, $2, NOW())
       ON CONFLICT (registration_id)
       DO UPDATE SET 
         points = teamscore.points + $2,
         last_update = NOW()`,
      [teamId, clusterPoints]
    );

    // Get updated team score
    const scoreResult = await client.query(
      `SELECT points FROM teamscore WHERE registration_id = $1`,
      [teamId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      teamId,
      clusterPoints,
      totalPoints: scoreResult.rows[0].points
    });

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[tap API error]', e);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

// ===================================================================
// POST /api/tags/rfid-detected
// Called when RFID hardware detects a card tap
// ===================================================================
router.post('/rfid-detected', async (req, res) => {
  const { rfid, portal } = req.body;

  if (!rfid || !portal) {
    return res.status(400).json({ error: 'rfid and portal are required' });
  }

  // Auto-determine cluster based on portal (e.g., reader1, reader1a, reader1b -> cluster1)
  let cluster = portal.replace('reader', 'cluster').toLowerCase();
  
  // Handle multiple readers per cluster (reader1a, reader1b -> cluster1)
  if (cluster.includes('a') || cluster.includes('b')) {
    cluster = cluster.replace(/[ab]$/, '');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID is assigned to a team
    const teamResult = await client.query(
      `SELECT registration_id FROM members WHERE rfid_card_id = $1`,
      [rfid]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'RFID not assigned to any team',
        rfid,
        portal,
        cluster
      });
    }

    const teamId = teamResult.rows[0].registration_id;

    // Check if this member has already tapped this cluster
    const existingTap = await client.query(
      `SELECT 1 FROM logs 
       WHERE rfid_card_id = $1 AND label = $2 AND portal = $3`,
      [rfid, cluster, portal]
    );

    if (existingTap.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Member has already tapped this cluster',
        rfid,
        portal,
        cluster,
        teamId
      });
    }

    // Record the tap
    await client.query(
      `INSERT INTO logs (rfid_card_id, portal, label, log_time)
       VALUES ($1, $2, $3, NOW())`,
      [rfid, cluster, portal]
    );

    // Get cluster points from system config
    const configResult = await client.query(
      `SELECT points FROM system_config WHERE cluster = $1`,
      [cluster]
    );

    const clusterPoints = configResult.rows.length > 0 ? configResult.rows[0].points : 0;

    // Update team score
    await client.query(
      `INSERT INTO teamscore (registration_id, points, last_update)
       VALUES ($1, $2, NOW())
       ON CONFLICT (registration_id)
       DO UPDATE SET 
         points = teamscore.points + $2,
         last_update = NOW()`,
      [teamId, clusterPoints]
    );

    // Get updated team score
    const scoreResult = await client.query(
      `SELECT points FROM teamscore WHERE registration_id = $1`,
      [teamId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      rfid,
      portal,
      cluster,
      teamId,
      clusterPoints,
      totalPoints: scoreResult.rows[0].points,
      message: `+${clusterPoints} points! Total: ${scoreResult.rows[0].points}`
    });

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[rfid-detected API error]', e);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

// ===================================================================
// POST /api/tags/rfid-tap-secondary
// Handle taps from secondary readers (score but no display)
// ===================================================================
router.post('/rfid-tap-secondary', async (req, res) => {
  const { rfid, portal } = req.body;

  if (!rfid || !portal) {
    return res.status(400).json({ error: 'rfid and portal are required' });
  }

  // Auto-determine cluster based on portal (e.g., reader1a, reader1b -> cluster1)
  let cluster = portal.replace('reader', 'cluster').toLowerCase();
  
  // Handle multiple readers per cluster (reader1a, reader1b -> cluster1)
  if (cluster.includes('a') || cluster.includes('b')) {
    cluster = cluster.replace(/[ab]$/, '');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID is assigned to a team
    const teamResult = await client.query(
      `SELECT registration_id FROM members WHERE rfid_card_id = $1`,
      [rfid]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'RFID not assigned to any team',
        rfid,
        portal,
        cluster
      });
    }

    const teamId = teamResult.rows[0].registration_id;

    // Check if this member has already tapped this cluster
    const existingTap = await client.query(
      `SELECT 1 FROM logs 
       WHERE rfid_card_id = $1 AND label = $2 AND portal = $3`,
      [rfid, cluster, portal]
    );

    if (existingTap.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Member has already tapped this cluster',
        rfid,
        portal,
        cluster,
        teamId
      });
    }

    // Record the tap
    await client.query(
      `INSERT INTO logs (rfid_card_id, portal, label, log_time)
       VALUES ($1, $2, $3, NOW())`,
      [rfid, cluster, portal]
    );

    // Get cluster points from system config
    const configResult = await client.query(
      `SELECT points FROM system_config WHERE cluster = $1`,
      [cluster]
    );

    const clusterPoints = configResult.rows.length > 0 ? configResult.rows[0].points : 0;

    // Update team score
    await client.query(
      `INSERT INTO teamscore (registration_id, points, last_update)
       VALUES ($1, $2, NOW())
       ON CONFLICT (registration_id)
       DO UPDATE SET 
         points = teamscore.points + $2,
         last_update = NOW()`,
      [teamId, clusterPoints]
    );

    // Get updated team score
    const scoreResult = await client.query(
      `SELECT points FROM teamscore WHERE registration_id = $1`,
      [teamId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      rfid,
      portal,
      cluster,
      teamId,
      clusterPoints,
      totalPoints: scoreResult.rows[0].points,
      message: `Scored +${clusterPoints} points (no display)`
    });

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[rfid-tap-secondary API error]', e);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});


// Utility: Ensure all REGISTERed cards in logs are present in rfid_cards
async function syncRfidCardsFromLogs() {
  try {
    const { rows } = await pool.query(`SELECT DISTINCT rfid_card_id, portal FROM logs WHERE label = 'REGISTER'`);
    for (const row of rows) {
      const { rfid_card_id, portal } = row;
      const exists = await pool.query(`SELECT 1 FROM rfid_cards WHERE rfid_card_id = $1`, [rfid_card_id]);
      if (exists.rowCount === 0) {
        await pool.query(`INSERT INTO rfid_cards (rfid_card_id, status, portal) VALUES ($1, 'available', $2)`, [rfid_card_id, portal]);
      }
    }
  } catch (e) {
    console.error('[syncRfidCardsFromLogs] Error:', e.message || e);
  }
}


// ===================================================================
// POST /api/tags/updateCount
// Update the group_size for the latest registration for a portal
// ===================================================================
router.post('/updateCount', async (req, res) => {
  const { portal, count } = req.body || {};
  if (!portal) return badReq(res, 'Portal is required');
  if (!count || isNaN(count) || count < 1) return badReq(res, 'Count must be >= 1');
  try {
    // Update the latest registration for this portal
    const result = await pool.query(
      `UPDATE registration
       SET group_size = $1
       WHERE id = (
         SELECT id FROM registration WHERE portal = $2 ORDER BY id DESC LIMIT 1
       )
       RETURNING id`,
      [count, portal]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'No registration found for portal' });
    return res.status(200).json({ success: true, id: result.rows[0].id });
  } catch (e) {
    return handleError(res, e);
  }
});

// ===================================================================
// POST /api/tags/register
// Register a new individual or group leader
// ===================================================================
router.post('/register', async (req, res) => {
  const {
    portal,
    group_size,
    province = null,
    district = null,
    school = null,
    university = null,
    age_range = null,
    sex = null,
    lang = null
  } = req.body || {};

  if (!portal) return badReq(res, 'Portal is required');
  if (!group_size || isNaN(group_size) || group_size < 1) return badReq(res, 'Group size must be >= 1');

  try {
    await syncRfidCardsFromLogs();
    const result = await pool.query(
      `INSERT INTO registration (portal, group_size, school, university, province, district, age_range, sex, lang)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [portal, group_size, school, university, province, district, age_range, sex, lang]
    );
    return res.status(200).json({ id: result.rows[0].id });
  } catch (e) {
    return handleError(res, e);
  }
});

function handleError(res, err) {
  // Log full error for debugging
  console.error('[API ERROR]', err && err.stack ? err.stack : err);
  // Log the actual error message for troubleshooting
  if (err && err.message) {
    console.error('[API ERROR MESSAGE]', err.message);
  }
  const msg = String(err?.message || err || '');
  if (/^Leader\s+not\s+found$/i.test(msg)) return res.status(404).json({ error: 'Leader not found' });
  if (/^Tag\s+already\s+assigned$/i.test(msg)) return res.status(409).json({ error: 'Tag already assigned' });
  if (/^No\s+matching\s+entry\s+in\s+log$/i.test(msg)) return res.status(404).json({ error: 'No matching entry in log' });
  if (/^No\s+card\s+tapped\s+for\s+registration$/i.test(msg)) return res.status(400).json({ error: 'No card tapped for registration' });
  if (/^Tapped\s+card\s+is\s+not\s+available\s+for\s+registration$/i.test(msg)) return res.status(400).json({ error: 'Tapped card is not available for registration' });
  // Return the actual error message for server errors
  return res.status(500).json({ error: 'Server error: ' + msg });
}

// ---------- log query ----------
// Helper: Get the latest available tag for a portal
// Helper: Get the last REGISTERed tag from logs for a portal, only if available
async function getLastRegisterLogAvailableTag(portal) {
  // Get last REGISTER log for portal
  const { rows } = await pool.query(
    `SELECT rfid_card_id
       FROM logs
      WHERE label = 'REGISTER' AND portal = $1
      ORDER BY log_time DESC
      LIMIT 1`,
    [portal]
  );
  let tagId;
  if (rows.length === 0) {
    // No card tapped for registration
    throw new Error('No card tapped for registration');
  } else {
    tagId = rows[0].rfid_card_id;
    // Check if tag is available
    const card = await pool.query(
      `SELECT status FROM rfid_cards WHERE rfid_card_id = $1`, [tagId]
    );
    if (card.rowCount === 0 || card.rows[0].status !== 'available') {
      throw new Error('Tapped card is not available for registration');
    }
  }
  return tagId;
}
async function getLastTagFromDB(wantedLabels, portal) {
// Helper: Get the latest available tag for a portal
async function getLastAvailableTagFromDB(portal) {
  const { rows } = await pool.query(
    `SELECT rfid_card_id
       FROM rfid_cards
      WHERE portal = $1 AND status = 'available'
      ORDER BY rfid_card_id DESC
      LIMIT 1`,
    [portal]
  );
  if (rows.length === 0) throw new Error('No available tag for this portal');
  return rows[0].rfid_card_id;
}
  const { rows } = await pool.query(
    `SELECT rfid_card_id
       FROM logs
      WHERE label = ANY($1)
        AND portal = $2
      ORDER BY log_time DESC
      LIMIT 1`,
    [wantedLabels, portal]
  );
  if (rows.length === 0) throw new Error('No matching entry in log');
  return rows[0].rfid_card_id;
}

// ---------- DB helpers ----------
async function lockOrCreateCard(client, tagId, portal) {
  let r = await client.query(
    `SELECT rfid_card_id, status FROM rfid_cards WHERE rfid_card_id=$1 FOR UPDATE`,
    [tagId]
  );
  if (r.rowCount === 0) {
    // Insert new card as 'available' if not present
    await client.query(
      `INSERT INTO rfid_cards (rfid_card_id, status, portal)
       VALUES ($1, 'available', $2)`,
      [tagId, portal]
    );
    r = await client.query(
      `SELECT rfid_card_id, status FROM rfid_cards WHERE rfid_card_id=$1 FOR UPDATE`,
      [tagId]
    );
  }
  return r.rows[0];
}

async function assignTagToLeader(client, tagId, leaderId, portal) {
  // Only assign if card is available and was tapped (checked in getLastRegisterLogAvailableTag)
  const card = await client.query(
    `SELECT status FROM rfid_cards WHERE rfid_card_id = $1 FOR UPDATE`, [tagId]
  );
  if (card.rowCount === 0 || card.rows[0].status.toLowerCase() !== 'available') {
    throw new Error('Tapped card is not available for registration');
  }
  const r = await client.query(
    `SELECT id FROM registration WHERE id=$1 AND portal=$2 FOR UPDATE`,
    [leaderId, portal]
  );
  if (r.rowCount === 0) throw new Error('Leader not found');
  await client.query(
    `INSERT INTO members (registration_id, rfid_card_id, role, portal)
     VALUES ($1, $2, 'LEADER', $3)`,
    [leaderId, tagId, portal]
  );
  await client.query(`UPDATE rfid_cards SET status='assigned', portal=$2 WHERE rfid_card_id=$1`, [tagId, portal]);
}

async function assignTagToMember(client, tagId, leaderId, portal) {
  // Only assign if card is available and was tapped (checked in getLastRegisterLogAvailableTag)
  const card = await client.query(
    `SELECT status FROM rfid_cards WHERE rfid_card_id = $1 FOR UPDATE`, [tagId]
  );
  if (card.rowCount === 0 || card.rows[0].status.toLowerCase() !== 'available') {
    throw new Error('Tapped card is not available for registration');
  }
  const r = await client.query(
    `SELECT id FROM registration WHERE id=$1 AND portal=$2 FOR UPDATE`,
    [leaderId, portal]
  );
  if (r.rowCount === 0) throw new Error('Leader not found');
  await client.query(
    `INSERT INTO members (registration_id, rfid_card_id, role, portal)
     VALUES ($1, $2, 'MEMBER', $3)`,
    [leaderId, tagId, portal]
  );
  await client.query(`UPDATE rfid_cards SET status='assigned', portal=$2 WHERE rfid_card_id=$1`, [tagId, portal]);
}

async function releaseTag(client, tagId, portal) {
  await lockOrCreateCard(client, tagId, portal);
  // Delete all members with this card (regardless of portal)
  await client.query(`DELETE FROM members WHERE rfid_card_id=$1`, [tagId]);
  await client.query(`UPDATE rfid_cards SET status='available' WHERE rfid_card_id=$1`, [tagId]);
}

// ===================================================================
// POST /api/tags/log
// Simulate/log a tap at a portal (for testing or manual tap)
// ===================================================================
router.post('/log', async (req, res) => {
  const { portal, label, rfid_card_id } = req.body || {};
  if (!portal || !label) return res.status(400).json({ error: 'portal and label are required' });
  try {
    // Use a dummy/test RFID if not provided
    const rfid = rfid_card_id || 'SIMULATED_RFID_' + portal;
    await pool.query(
      `INSERT INTO logs (rfid_card_id, portal, label, log_time)
       VALUES ($1, $2, $3, NOW())`,
      [rfid, portal, label]
    );
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('[log API error]', e);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===================================================================
// Background EXITOUT watcher (every 3s)
// ===================================================================
// Track last processed log_time per portal
let lastProcessedExitout = {};

async function checkAndReleaseOnNewExitout() {
  try {
    const now = new Date();
    // For each portal, process all new EXITOUT/EXIT logs since last processed
    const { rows } = await pool.query(`
      SELECT rfid_card_id, portal, log_time
      FROM logs
      WHERE label IN ('EXITOUT','EXIT')
      ORDER BY portal, log_time ASC
    `);

    // Group logs by portal
    const logsByPortal = {};
    for (const row of rows) {
      if (!logsByPortal[row.portal]) logsByPortal[row.portal] = [];
      logsByPortal[row.portal].push(row);
    }

    for (const portal in logsByPortal) {
      for (const row of logsByPortal[portal]) {
        const { rfid_card_id: tagId, log_time } = row;
        const logDate = new Date(log_time);
        // Only process if log_time is newer than last processed for this portal
        // AND the tag was assigned within the last 3 minutes
        if (
          (!lastProcessedExitout[portal] || logDate > new Date(lastProcessedExitout[portal])) &&
          (now - logDate <= 180000)
        ) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            await releaseTag(client, tagId, portal);
            // If this card belonged to a team, and now the team has 0 members, purge teamscore
            const reg = await client.query(`SELECT registration_id FROM members WHERE rfid_card_id=$1`, [tagId]);
            if (reg.rowCount > 0) {
              const registrationId = reg.rows[0].registration_id;
              const remaining = await client.query(`SELECT 1 FROM members WHERE registration_id=$1 LIMIT 1`, [registrationId]);
              if (remaining.rowCount === 0) {
                await client.query(`DELETE FROM teamscore WHERE registration_id=$1`, [registrationId]);
              }
            }
            await client.query('COMMIT');
            lastProcessedExitout[portal] = log_time;
            console.log(`[EXITOUT watcher] Released tag: ${tagId} from ${portal} at ${log_time}`);
          } catch (e) {
            await client.query('ROLLBACK');
            console.error('[EXITOUT watcher] Error:', e.message || e);
          } finally {
            client.release();
          }
        }
      }
    }
  } catch (e) {
    // no EXITOUT found
  }
}


setInterval(checkAndReleaseOnNewExitout, 3000);
