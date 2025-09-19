const pool = require('../db/pool');

// ===============================
// Get cluster occupancy
// ===============================
const getClusterOccupancy = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        latest.label as zone_code,
        COUNT(*) as current_count,
        NOW() as as_of_time
      FROM (
        SELECT DISTINCT ON (l.rfid_card_id) 
          l.rfid_card_id, 
          l.label, 
          l.log_time
        FROM logs l
        WHERE l.label LIKE 'CLUSTER%'
        ORDER BY l.rfid_card_id, l.log_time DESC
      ) latest
      WHERE latest.label LIKE 'CLUSTER%'
      GROUP BY latest.label
      ORDER BY latest.label;
    `);
    
    // new shape: array of objects [{ zone_id, current_visitors }, ...]
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      return res.json([]);
    }
    const mapped = list.map((r) => {
      const code = String(r.zone_code || "").trim();
      const numMatch = code.match(/(\d+)/);
      const zoneNum = numMatch ? Number(numMatch[1]) : 0;
      const zone = `zone${zoneNum}`;
      const visitors = Number(r.current_count ?? 0);
      return { zone_id: zone, current_visitors: visitors };
    });
    return res.json(mapped);
  } catch (err) {
    console.error('[getClusterOccupancy] Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
};

// ===============================
// Derive movements
// ===============================
const deriveMovements = async (req, res) => {
  try {
    // Create movements table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movements (
        id SERIAL PRIMARY KEY,
        rfid_card_id VARCHAR(32) NOT NULL,
        from_zone VARCHAR(50),
        to_zone VARCHAR(50) NOT NULL,
        movement_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Clear existing movements
    await pool.query('DELETE FROM movements');
    
    // Get all logs ordered by time, joined with members to get registration info
    const { rows: logs } = await pool.query(`
      SELECT 
        l.rfid_card_id,
        l.label,
        l.log_time,
        m.registration_id,
        r.portal as registration_portal
      FROM logs l
      LEFT JOIN members m ON l.rfid_card_id = m.rfid_card_id
      LEFT JOIN registration r ON m.registration_id = r.id
      WHERE l.label LIKE 'CLUSTER%' OR l.label = 'EXITOUT'
      ORDER BY l.log_time ASC;
    `);
    
    // Process movements
    const movements = [];
    const cardLastZone = new Map();
    
    for (const log of logs) {
      const rfidCardId = log.rfid_card_id;
      const currentZone = log.label;
      const logTime = log.log_time;
      
      if (cardLastZone.has(rfidCardId)) {
        const lastZone = cardLastZone.get(rfidCardId);
        if (lastZone !== currentZone) {
          // Movement detected
          movements.push({
            rfid_card_id: rfidCardId,
            from_zone: lastZone,
            to_zone: currentZone,
            movement_time: logTime
          });
        }
      }
      
      cardLastZone.set(rfidCardId, currentZone);
    }
    
    // Insert movements into database
    if (movements.length > 0) {
      const values = movements.map(m => 
        `('${m.rfid_card_id}', '${m.from_zone}', '${m.to_zone}', '${m.movement_time.toISOString()}')`
      ).join(', ');
      
      await pool.query(`
        INSERT INTO movements (rfid_card_id, from_zone, to_zone, movement_time)
        VALUES ${values};
      `);
    }
    
    res.json({
      success: true,
      message: 'Movements derived successfully'
    });
  } catch (err) {
    console.error('[deriveMovements] Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Database error' 
    });
  }
};

module.exports = {
  getClusterOccupancy,
  deriveMovements
};
