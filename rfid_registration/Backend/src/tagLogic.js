const { pool, syncRfidCardsFromLogs, lockOrCreateCard } = require('./dbHelpers');

async function assignTagToLeader(client, tagId, leaderId, portal) {
  const card = await lockOrCreateCard(client, tagId, portal);
  if (card.status.toLowerCase() === 'assigned') throw new Error('Tag already assigned');
  const r = await client.query(
    `SELECT id FROM registration WHERE id=$1 AND portal=$2 FOR UPDATE`,
    [leaderId, portal]
  );
  if (r.rowCount === 0) throw new Error('Leader not found');
  await client.query(
    `INSERT INTO members (registration_id, rfid_card_id, portal)
     VALUES ($1, $2, $3)`,
    [leaderId, tagId, portal]
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
  await client.query(
    `INSERT INTO members (registration_id, rfid_card_id, portal)
     VALUES ($1, $2, $3)`,
    [leaderId, tagId, portal]
  );
  await client.query(`UPDATE rfid_cards SET status='assigned', portal=$2 WHERE rfid_card_id=$1`, [tagId, portal]);
}

async function releaseTag(client, tagId, portal) {
  await lockOrCreateCard(client, tagId, portal);
  await client.query(`DELETE FROM members WHERE rfid_card_id=$1`, [tagId]);
  await client.query(`UPDATE rfid_cards SET status='available' WHERE rfid_card_id=$1`, [tagId]);
}

module.exports = {
  assignTagToLeader,
  assignTagToMember,
  releaseTag,
  syncRfidCardsFromLogs,
  pool
};
