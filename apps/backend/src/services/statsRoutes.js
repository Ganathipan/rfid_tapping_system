const express = require('express');
const router = express.Router();
const {
  getClusterOccupancy
} = require('./statsController');

// Routes
router.get('/cluster-occupancy', getClusterOccupancy);

module.exports = router;
