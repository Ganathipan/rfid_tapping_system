const express = require('express');
const router = express.Router();

// In-memory storage for admin portals
let portals = [];
let nextId = 1;

// Get all admin portals
router.get('/portals', (req, res) => {
  res.json(portals);
});

// Add/update portal config
router.post('/portal-config', (req, res) => {
  const { clusters, exhibits, threshold } = req.body;
  const portal = {
    id: nextId++,
    name: `Admin Portal ${Date.now()}`,
    clusters,
    exhibits,
    threshold
  };
  portals.push(portal);
  res.json(portal);
});

module.exports = router;
