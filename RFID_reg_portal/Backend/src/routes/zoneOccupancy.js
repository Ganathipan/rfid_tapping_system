const express = require('express');
const router = express.Router();
const zoneOccupancyService = require('../services/zoneOccupancyService');

// GET /api/cluster-occupancy
router.get('/cluster-occupancy', async (req, res) => {
  try {
    const data = await zoneOccupancyService.getClusterOccupancy();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// POST /api/derive-movements
router.post('/derive-movements', async (req, res) => {
  try {
    await zoneOccupancyService.deriveMovements();
    res.json({ success: true, message: 'Movements derived successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

module.exports = router;
