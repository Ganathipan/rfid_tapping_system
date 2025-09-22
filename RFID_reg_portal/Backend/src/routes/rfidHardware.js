const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { handlePostLogInserted } = require('../services/gameLiteService');

// Hardware Site Setup Instructions
// Reader Software:
// RFID endpoint
router.post('/rfidRead', async (req, res) => {
  const { reader, portal, tag } = req.body;
  console.log(`[RFID DECODE] Received:`, { reader, portal, tag });

  if (!reader || !portal || !tag) {
    return res.status(400).json({ error: 'Missing reader, portal or tag' });
  }

  try {
    const query = `
      INSERT INTO logs (log_time, rfid_card_id, portal, label)
      VALUES (NOW(), $1, $2, $3)
      RETURNING id, log_time, rfid_card_id, portal, label
    `;
    const values = [tag, portal, reader];
  const result = await pool.query(query, values);

    // If EXITOUT, update rfid_cards status to 'released' only if tap is after last_assigned_time
    if (reader === 'EXITOUT') {
      const cardRes = await pool.query(`SELECT last_assigned_time FROM rfid_cards WHERE rfid_card_id = $1`, [tag]);
      if (cardRes.rowCount > 0) {
        const lastAssigned = cardRes.rows[0].last_assigned_time;
        // Only release if tap is after last_assigned_time
        const tapTimeRes = await pool.query(`SELECT log_time FROM logs WHERE id = $1`, [result.rows[0].id]);
        const tapTime = tapTimeRes.rows[0].log_time;
        if (!lastAssigned || tapTime > lastAssigned) {
          await pool.query(`UPDATE rfid_cards SET status='released' WHERE rfid_card_id = $1`, [tag]);
          // decrement venue crowd by 1 (person leaving)
          try {
            const { decCrowd } = require('../services/venueState');
            await decCrowd(1);
          } catch (_) {}
        }
      }
    }

    // Game Lite post-insert hook (non-blocking best-effort)
    try {
      await handlePostLogInserted(result.rows[0]);
    } catch (hookErr) {
      console.warn('[GameLite hook] error:', hookErr.message || hookErr);
    }

    res.json({ status: 'success', entry: result.rows[0] });
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

module.exports = router;