const pool = require('./db/pool');

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

async function lockOrCreateCard(client, tagId, portal) {
  let r = await client.query(
    `SELECT rfid_card_id, status FROM rfid_cards WHERE rfid_card_id=$1 FOR UPDATE`,
    [tagId]
  );
  if (r.rowCount === 0) {
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

module.exports = {
  pool,
  syncRfidCardsFromLogs,
  lockOrCreateCard
};
