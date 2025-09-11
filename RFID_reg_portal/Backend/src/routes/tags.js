// routes/tags.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// ===================================================================
// POST /api/tags/register
// Register a new individual or group leader
// ===================================================================
router.post('/register', async (req, res) => {
  const {
    desk,
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
  if (!desk) return badReq(res, 'Desk is required');
  if (!name) return badReq(res, 'Name is required');
  if (!group_size || isNaN(group_size) || group_size < 1) return badReq(res, 'Group size must be >= 1');

  try {
    const result = await pool.query(
      `INSERT INTO registration (desk, name, group_size, rfid_card_id, school, university, province, district, age_range, sex, lang)
       VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [desk, name, group_size, school, university, province, district, age_range, sex, lang]
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
  const msg = String(err?.message || err || '');
  if (/^Leader\s+not\s+found$/i.test(msg)) return res.status(404).json({ error: 'Leader not found' });
  if (/^Tag\s+already\s+assigned$/i.test(msg)) return res.status(409).json({ error: 'Tag already assigned' });
  if (/^No\s+matching\s+entry\s+in\s+log$/i.test(msg)) return res.status(404).json({ error: 'No matching entry in log' });
  return res.status(500).json({ error: 'Server error' });
}

// ---------- log query ----------
async function getLastTagFromDB(wantedLabels, desk) {
  const { rows } = await pool.query(
    `SELECT rfid_card_id
       FROM logs
      WHERE label = ANY($1)
        AND desk = $2
      ORDER BY log_time DESC
      LIMIT 1`,
    [wantedLabels, desk]
  );
  if (rows.length === 0) throw new Error('No matching entry in log');
  return rows[0].rfid_card_id;
}

// ---------- DB helpers ----------
async function lockOrCreateCard(client, tagId, desk) {
  let r = await client.query(
    `SELECT rfid_card_id, status FROM rfid_cards WHERE rfid_card_id=$1 FOR UPDATE`,
    [tagId]
  );
  if (r.rowCount === 0) {
    await client.query(
      `INSERT INTO rfid_cards (rfid_card_id, status, desk)
       VALUES ($1, 'available', $2)`,
      [tagId, desk]
    );
    r = await client.query(
      `SELECT rfid_card_id, status FROM rfid_cards WHERE rfid_card_id=$1 FOR UPDATE`,
      [tagId]
    );
  }
  return r.rows[0];
}

async function assignTagToLeader(client, tagId, leaderId, desk) {
  const card = await lockOrCreateCard(client, tagId, desk);
  if (card.status.toLowerCase() === 'assigned') throw new Error('Tag already assigned');

  const r = await client.query(
    `SELECT id FROM registration WHERE id=$1 AND desk=$2 FOR UPDATE`,
    [leaderId, desk]
  );
  if (r.rowCount === 0) throw new Error('Leader not found');

  await client.query(`UPDATE registration SET rfid_card_id=$1 WHERE id=$2`, [tagId, leaderId]);
  await client.query(`UPDATE rfid_cards SET status='assigned', desk=$2 WHERE rfid_card_id=$1`, [tagId, desk]);
}

async function assignTagToMember(client, tagId, leaderId, desk) {
  const card = await lockOrCreateCard(client, tagId, desk);
  if (card.status.toLowerCase() === 'assigned') throw new Error('Tag already assigned');

  const r = await client.query(
    `SELECT id FROM registration WHERE id=$1 AND desk=$2 FOR UPDATE`,
    [leaderId, desk]
  );
  if (r.rowCount === 0) throw new Error('Leader not found');

  await client.query(
    `INSERT INTO members (desk, leader_id, rfid_card_id, status)
     VALUES ($1, $2, $3, 'assigned')`,
    [desk, leaderId, tagId]
  );
  await client.query(`UPDATE rfid_cards SET status='assigned', desk=$2 WHERE rfid_card_id=$1`, [tagId, desk]);
}

async function releaseTag(client, tagId, desk) {
  await lockOrCreateCard(client, tagId, desk);
  await client.query(`UPDATE registration SET rfid_card_id=NULL WHERE rfid_card_id=$1 AND desk=$2`, [tagId, desk]);
  await client.query(`DELETE FROM members WHERE rfid_card_id=$1 AND desk=$2`, [tagId, desk]);
  await client.query(`UPDATE rfid_cards SET status='available' WHERE rfid_card_id=$1`, [tagId]);
}

// ===================================================================
// POST /api/tags/register
// Create a new leader/individual row
// ===================================================================
router.post('/register', async (req, res) => {
  const {
    desk,
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

  if (!desk) return badReq(res, 'Desk is required');
  if (!name) return badReq(res, 'Name is required');
  if (!group_size || isNaN(group_size) || group_size < 1) return badReq(res, 'Group size must be >= 1');

  try {
    const result = await pool.query(
      `INSERT INTO registration
       (desk, name, group_size, rfid_card_id, school, university, province, district, age_range, sex, lang)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [desk, name, group_size, school, university, province, district, age_range, sex, lang]
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
  const { desk, leaderId, asLeader } = req.body || {};
  if (!desk) return badReq(res, 'Desk is required');
  if (!leaderId) return badReq(res, 'Leader ID is required');

  let tagId;
  try {
    tagId = await getLastTagFromDB(['REGISTER'], desk);
  } catch (e) {
    return handleError(res, e);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (asLeader) {
      await assignTagToLeader(client, tagId, leaderId, desk);
    } else {
      await assignTagToMember(client, tagId, leaderId, desk);
    }
    await client.query('COMMIT');
    res.status(200).json({ ok: true, desk, leaderId, tagId, role: asLeader ? 'leader' : 'member' });
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
    const result = await pool.query(`SELECT rfid_card_id, status, desk FROM rfid_cards ORDER BY rfid_card_id`);
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
      SELECT DISTINCT ON (desk) rfid_card_id, desk, log_time
      FROM logs
      WHERE label IN ('EXITOUT','EXIT')
      ORDER BY desk, log_time DESC
    `);

    for (const row of rows) {
      const { rfid_card_id: tagId, desk, log_time } = row;
      if (lastProcessedExitout[desk] !== tagId) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await releaseTag(client, tagId, desk);
          await client.query('COMMIT');
          lastProcessedExitout[desk] = tagId;
          console.log(`[EXITOUT watcher] Released tag: ${tagId} from ${desk} at ${log_time}`);
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
