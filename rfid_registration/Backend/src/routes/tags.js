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

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

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
    name,
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
  if (!name) return badReq(res, 'Name is required');
  if (!group_size || isNaN(group_size) || group_size < 1) return badReq(res, 'Group size must be >= 1');

  try {
    await syncRfidCardsFromLogs();
    const result = await pool.query(
      `INSERT INTO registration (portal, name, group_size, school, university, province, district, age_range, sex, lang)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [portal, name, group_size, school, university, province, district, age_range, sex, lang]
    );
    return res.status(200).json({ id: result.rows[0].id });
  } catch (e) {
    return handleError(res, e);
  }
});

// ---------- small utils ----------
const badReq = (res, msg) => res.status(400).json({ error: msg });

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
  if (rows.length === 0) throw new Error('No REGISTER log found for this portal');
  const tagId = rows[0].rfid_card_id;
  // Check if tag is available
  const card = await pool.query(
    `SELECT status FROM rfid_cards WHERE rfid_card_id = $1`, [tagId]
  );
  if (card.rowCount === 0 || card.rows[0].status !== 'available') {
    throw new Error('Last REGISTERed tag is not available');
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
  const card = await lockOrCreateCard(client, tagId, portal);
  if (card.status.toLowerCase() === 'assigned') throw new Error('Tag already assigned');

  const r = await client.query(
    `SELECT id, name FROM registration WHERE id=$1 AND portal=$2 FOR UPDATE`,
    [leaderId, portal]
  );
  if (r.rowCount === 0) throw new Error('Leader not found');

  // Insert leader into members table with role 'LEADER'
  await client.query(
    `INSERT INTO members (registration_id, name, rfid_card_id, role, portal)
     VALUES ($1, $2, $3, 'LEADER', $4)`,
    [leaderId, r.rows[0].name, tagId, portal]
  );
  await client.query(`UPDATE rfid_cards SET status='assigned', portal=$2 WHERE rfid_card_id=$1`, [tagId, portal]);
}

async function assignTagToMember(client, tagId, leaderId, portal) {
  const card = await lockOrCreateCard(client, tagId, portal);
  if (card.status.toLowerCase() === 'assigned') throw new Error('Tag already assigned');

  const r = await client.query(
    `SELECT id FROM registration WHERE id=$1 AND portal=$2 FOR UPDATE`,
    [leaderId, portal]
  );
  if (r.rowCount === 0) throw new Error('Leader not found');

  // Insert member into members table with role 'MEMBER'
  await client.query(
    `INSERT INTO members (registration_id, name, rfid_card_id, role, portal)
     VALUES ($1, NULL, $2, 'MEMBER', $3)`,
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
// POST /api/tags/register
// Create a new leader/individual row
// ===================================================================
router.post('/register', async (req, res) => {
  const {
    portal,
    name,
    group_size,
    province = null,
    district = null,
    school = null,
    university = null,
    age_range = null,
    sex = null,
    lang = null
  } = req.body || {};

  if (!portal) return badReq(res, 'portal is required');
  if (!name) return badReq(res, 'Name is required');
  if (!group_size || isNaN(group_size) || group_size < 1) return badReq(res, 'Group size must be >= 1');

  try {
    const result = await pool.query(
      `INSERT INTO registration
       (portal, name, group_size, rfid_card_id, school, university, province, district, age_range, sex, lang)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [portal, name, group_size, school, university, province, district, age_range, sex, lang]
    );
    res.status(200).json({ id: result.rows[0].id });
  } catch (e) {
    return handleError(res, e);
  }
});

// ===================================================================
// POST /api/tags/link
// Assign last REGISTERed card from logs to leader or member
// ===================================================================
router.post('/link', async (req, res) => {
  const { portal, leaderId, asLeader } = req.body || {};
  if (!portal) return badReq(res, 'Portal is required');
  if (!leaderId) return badReq(res, 'Leader ID is required');

  try {
    await syncRfidCardsFromLogs();
    tagId = await getLastRegisterLogAvailableTag(portal);
  } catch (e) {
    return handleError(res, e);
  }
// On server startup, sync rfid_cards from logs
syncRfidCardsFromLogs();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (asLeader) {
      await assignTagToLeader(client, tagId, leaderId, portal);
    } else {
      await assignTagToMember(client, tagId, leaderId, portal);
    }
    await client.query('COMMIT');
    res.status(200).json({ ok: true, portal, leaderId, tagId, role: asLeader ? 'LEADER' : 'MEMBER' });
  } catch (e) {
    await client.query('ROLLBACK');
    return handleError(res, e);
  } finally {
    client.release();
  }
});

// ===================================================================
// GET /api/tags/list-cards
// Show all RFID cards and their status
// ===================================================================
router.get('/list-cards', async (_req, res) => {
  try {
    const result = await pool.query(`SELECT rfid_card_id, status, portal FROM rfid_cards ORDER BY rfid_card_id`);
    res.status(200).json(result.rows);
  } catch (e) {
    return handleError(res, e);
  }
});

// ===================================================================
// Background EXITOUT watcher (every 3s)
// ===================================================================
let lastProcessedExitout = {};

async function checkAndReleaseOnNewExitout() {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (portal) rfid_card_id, portal, log_time
      FROM logs
      WHERE label IN ('EXITOUT','EXIT')
      ORDER BY portal, log_time DESC
    `);

    for (const row of rows) {
      const { rfid_card_id: tagId, portal, log_time } = row;
      if (lastProcessedExitout[portal] !== tagId) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await releaseTag(client, tagId, portal);
          await client.query('COMMIT');
          lastProcessedExitout[portal] = tagId;
          console.log(`[EXITOUT watcher] Released tag: ${tagId} from ${portal} at ${log_time}`);
        } catch (e) {
          await client.query('ROLLBACK');
          console.error('[EXITOUT watcher] Error:', e.message || e);
        } finally {
          client.release();
        }
      }
    }
  } catch (e) {
    // no EXITOUT found
  }
}
setInterval(checkAndReleaseOnNewExitout, 3000);

module.exports = router;
