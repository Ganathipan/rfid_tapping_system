const pool = require('../db/pool');

// Returns the current number of people in each cluster
async function getClusterOccupancy() {
  const result = await pool.query(`
    SELECT cluster_code, current_count, as_of_time
    FROM cluster_occupancy
    ORDER BY cluster_code
  `);
  return result.rows;
}

// Triggers recalculation of movements and refreshes occupancy view
async function deriveMovements() {
  await pool.query('CALL derive_movements()');
}

module.exports = {
  getClusterOccupancy,
  deriveMovements,
};
