const express = require('express');
const { getLiveAnalytics, getRangeAnalytics } = require('./analyticsController');
const router = express.Router();

// GET /api/analytics/live?window_hours=24
router.get('/analytics/live', getLiveAnalytics);

// GET /api/analytics/range?from=2025-10-01T08:00:00Z&to=2025-10-01T10:00:00Z
router.get('/analytics/range', getRangeAnalytics);

module.exports = router;
