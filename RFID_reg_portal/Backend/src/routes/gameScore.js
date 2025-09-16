const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { getWeightedClusterScore } = require('../services/scoring');

// ===================================================================
// GET /api/tags/teamScore/:portal
// Returns the team score based on the last tap at this portal
// Uses weighted clusters defined in the admin portal configuration
// ===================================================================
router.get('/teamScore/:portal', async (req, res) => {
  const { portal } = req.params;

  try {
    // Find the last tap at this portal
    const { rows } = await pool.query(
      `SELECT rfid_card_id, log_time
         FROM logs
        WHERE portal = $1
        ORDER BY log_time DESC
        LIMIT 1`,
      [portal]
    );

    if (rows.length === 0) {
      return res.json({ message: "No taps yet" });
    }

    const rfid = rows[0].rfid_card_id;

    // Find the team this RFID belongs to
    const teamRes = await pool.query(
      `SELECT registration_id
         FROM members
        WHERE rfid_card_id = $1`,
      [rfid]
    );

    if (teamRes.rows.length === 0) {
      return res.json({ rfid, message: "Not assigned to a team" });
    }

    const teamId = teamRes.rows[0].registration_id;

    // Find all RFIDs in the same team
    const membersRes = await pool.query(
      `SELECT rfid_card_id FROM members WHERE registration_id = $1`,
      [teamId]
    );
    const memberIds = membersRes.rows.map(r => r.rfid_card_id);

    // Calculate weighted score based on distinct clusters visited by team
    const clustersRes = await pool.query(
      `SELECT DISTINCT label
         FROM logs
        WHERE rfid_card_id = ANY($1)
          AND label LIKE 'CLUSTER%'`,
      [memberIds]
    );

    const uniqueClusters = Array.from(new Set(clustersRes.rows.map(r => r.label)));
    const { points, breakdown, threshold } = getWeightedClusterScore(uniqueClusters);
    const eligible = points >= threshold;

    res.json({
      portal,
      teamId,
      points,
      eligible,
      threshold,
      lastTap: rows[0].log_time,
      breakdown
    });
  } catch (e) {
    console.error("[teamScore API error]", e);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
