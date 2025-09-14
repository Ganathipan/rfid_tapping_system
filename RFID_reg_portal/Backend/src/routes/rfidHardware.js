const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

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

    res.json({
      status: 'success',
      entry: result.rows[0]
    });
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

module.exports = router;