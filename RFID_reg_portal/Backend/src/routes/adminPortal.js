const express = require('express');
const router = express.Router();

const {
  addPortalConfig,
  getPortals
} = require('../store/adminConfigStore');

// Get all admin portal configurations
router.get('/portals', (_req, res) => {
  res.json(getPortals());
});

// Add/update portal config with weighted clusters
router.post('/portal-config', (req, res) => {
  try {
    const portal = addPortalConfig(req.body || {});
    res.json(portal);
  } catch (err) {
    console.error('[adminPortal] Failed to save config', err);
    res.status(400).json({ error: err.message || 'Invalid configuration payload' });
  }
});

module.exports = router;
