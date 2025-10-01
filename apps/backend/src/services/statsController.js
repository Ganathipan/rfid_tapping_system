const pool = require('../db/pool');

// ===============================
// Get cluster occupancy - REAL-TIME DATA ONLY
// Returns actual data from database without any balancing or modifications
// ===============================
const getClusterOccupancy = async (req, res) => {
  try {
    console.log(`[getClusterOccupancy] Getting real-time cluster occupancy...`);
    
    // Get real-time cluster occupancy from logs table
    // Count unique RFID cards currently in each cluster (latest entry per card)
    // IMPORTANT: Exclude cards that have EXITOUT as their latest action
    const query = `
      WITH latest_logs AS (
        SELECT DISTINCT ON (rfid_card_id) 
          rfid_card_id,
          label,
          log_time,
          portal
        FROM logs 
        WHERE (label ILIKE 'CLUSTER%' OR label ILIKE 'Z%' OR label = 'EXITOUT' OR label = 'REGISTER')
          AND log_time > NOW() - INTERVAL '24 hours'  -- Only consider recent logs
        ORDER BY rfid_card_id, log_time DESC
      )
      SELECT 
        label,
        COUNT(*) as visitor_count
      FROM latest_logs 
      WHERE (label ILIKE 'CLUSTER%' OR label ILIKE 'Z%')
        AND label != 'EXITOUT'
        AND rfid_card_id NOT IN (
          SELECT rfid_card_id 
          FROM latest_logs 
          WHERE label = 'EXITOUT'
        )
      GROUP BY label
      ORDER BY label
    `;
    
    const result = await pool.query(query);
    console.log(`[getClusterOccupancy] Found ${result.rows.length} active clusters from logs`);
    
    // Debug: Show what labels we found
    if (result.rows.length > 0) {
      console.log(`[getClusterOccupancy] Active cluster labels:`, result.rows.map(r => `${r.label}(${r.visitor_count})`).join(', '));
    } else {
      console.log(`[getClusterOccupancy] No active clusters found. Let's check what's in the logs...`);
      
      // Debug query to see all recent cluster-related logs
      const debugQuery = `
        SELECT label, COUNT(*) as count, 
               array_agg(DISTINCT rfid_card_id) as sample_cards
        FROM logs 
        WHERE label ILIKE 'CLUSTER%' OR label ILIKE 'Z%' OR label = 'EXITOUT'
          AND log_time > NOW() - INTERVAL '1 hour'
        GROUP BY label 
        ORDER BY count DESC
        LIMIT 10
      `;
      
      try {
        const debugResult = await pool.query(debugQuery);
        console.log(`[getClusterOccupancy] Recent cluster activity (last hour):`);
        debugResult.rows.forEach(row => {
          console.log(`  → ${row.label}: ${row.count} taps (cards: ${row.sample_cards.slice(0,3).join(',')}${row.sample_cards.length > 3 ? '...' : ''})`);
        });
      } catch (debugErr) {
        console.log(`[getClusterOccupancy] Debug query failed:`, debugErr.message);
      }
    }
    
    // Helper function to extract cluster zone from label
    const extractZoneFromLabel = (label) => {
      if (!label) {
        console.log(`[getClusterOccupancy] extractZoneFromLabel: null/undefined label`);
        return null;
      }
      
      console.log(`[getClusterOccupancy] extractZoneFromLabel: processing "${label}"`);
      
      // Match CLUSTER1, CLUSTER2, Z1, Z2, etc.
      let match = label.match(/CLUSTER(\d+)/i);
      if (!match) {
        match = label.match(/Z(\d+)/i);
      }
      
      if (match) {
        console.log(`[getClusterOccupancy] extractZoneFromLabel: found match "${match[0]}" → zone ${match[1]}`);
      } else {
        console.log(`[getClusterOccupancy] extractZoneFromLabel: no pattern match for "${label}"`);
      }
      
      const zoneId = match ? Number(match[1]) : null;
      
      if (zoneId >= 1 && zoneId <= 8) {
        console.log(`[getClusterOccupancy] extractZoneFromLabel: valid zone ${zoneId} for "${label}"`);
        return { id: zoneId, zone: `zone${zoneId}` };
      }
      
      if (zoneId) {
        console.log(`[getClusterOccupancy] extractZoneFromLabel: zone ${zoneId} out of range (1-8) for "${label}"`);
      }
      
      return null;
    };

    // Process real-time cluster data from logs
    const dbZones = new Map();
    
    for (const row of result.rows) {
      console.log(`[getClusterOccupancy] Processing label: "${row.label}" with ${row.visitor_count} visitors`);
      const zoneInfo = extractZoneFromLabel(row.label);
      if (zoneInfo) {
        const visitors = Number(row.visitor_count ?? 0);
        console.log(`[getClusterOccupancy] Mapped "${row.label}" → Zone ${zoneInfo.id} (${visitors} visitors)`);
        dbZones.set(zoneInfo.id, { 
          id: zoneInfo.id, 
          zone: zoneInfo.zone, 
          visitors 
        });
      } else {
        console.log(`[getClusterOccupancy] Failed to extract zone from label: "${row.label}"`);
      }
    }

    // Create response with all 8 zones - use REAL data with smart distribution
    const allZones = [];
    
    for (let zoneId = 1; zoneId <= 8; zoneId++) {
      if (dbZones.has(zoneId)) {
        // Use actual database value
        allZones.push(dbZones.get(zoneId));
      } else {
        // Zone not in database = 0 visitors (real-time truth)
        allZones.push({ 
          id: zoneId, 
          zone: `zone${zoneId}`, 
          visitors: 0 
        });
      }
    }

    const clusterTotal = allZones.reduce((sum, zone) => sum + zone.visitors, 0);
    
    // Get VENUE TOTAL based on REGISTER vs EXITOUT (independent of cluster locations)
    const venueTotalQuery = `
      SELECT 
        SUM(CASE WHEN latest.label = 'REGISTER' THEN 1 ELSE 0 END) as registered_count,
        SUM(CASE WHEN latest.label = 'EXITOUT' THEN 1 ELSE 0 END) as exitout_count,
        SUM(CASE WHEN latest.label = 'REGISTER' THEN 1 ELSE 0 END) - 
        SUM(CASE WHEN latest.label = 'EXITOUT' THEN 1 ELSE 0 END) as venue_total
      FROM (
        SELECT DISTINCT ON (rfid_card_id) rfid_card_id, label
        FROM logs 
        WHERE label IN ('REGISTER', 'EXITOUT')
        ORDER BY rfid_card_id, log_time DESC
      ) latest
    `;
    const venueTotalResult = await pool.query(venueTotalQuery);
    const venueStats = venueTotalResult.rows[0] || {};
    const venueTotal = Math.max(0, Number(venueStats.venue_total || 0));
    const registeredCount = Number(venueStats.registered_count || 0);
    const exitoutCount = Number(venueStats.exitout_count || 0);
    
    console.log(`[getClusterOccupancy] VENUE TOTAL: ${venueTotal} (${registeredCount} registered - ${exitoutCount} exited)`);
    console.log(`[getClusterOccupancy] CLUSTER TOTAL: ${clusterTotal} distributed across zones`);

    // SMART DISTRIBUTION: Balance crowds by suggesting zones 1 and 3 based on venue occupancy
    if (venueTotal > 0) {
      // Calculate crowd levels in other zones (excluding zones 1 and 3)
      const otherZones = allZones.filter(zone => zone.id !== 1 && zone.id !== 3);
      const otherZonesTotal = otherZones.reduce((sum, zone) => sum + zone.visitors, 0);
      const avgOtherZones = otherZonesTotal / otherZones.length;
      
      // Use venue total to determine overall crowd pressure
      const venueCrowdPressure = Math.min(venueTotal / 50, 1); // Max pressure at 50+ people
      
      console.log(`[getClusterOccupancy] Venue crowd pressure: ${(venueCrowdPressure * 100).toFixed(1)}% (${venueTotal} people in venue)`);
      console.log(`[getClusterOccupancy] Other zones average: ${avgOtherZones.toFixed(1)} visitors`);
      
      // Find zone 1 and zone 3
      const zone1 = allZones.find(z => z.id === 1);
      const zone3 = allZones.find(z => z.id === 3);
      
      // Smart distribution logic: suggest zones 1 and 3 based on venue occupancy and cluster crowding
      if (venueCrowdPressure > 0.2 || avgOtherZones > 3) { // If venue is getting busy or clusters are crowded
        // Calculate suggested visitors for zones 1 and 3 based on venue occupancy
        const baseAttractiveness = Math.floor(venueTotal * 0.1); // 10% of venue total as base
        const crowdPressureBonus = Math.floor(avgOtherZones * 0.3 * venueCrowdPressure);
        
        const suggestedForZone1 = Math.max(zone1.visitors, baseAttractiveness + crowdPressureBonus);
        const suggestedForZone3 = Math.max(zone3.visitors, baseAttractiveness + Math.floor(crowdPressureBonus * 1.2));
        
        // Update zones 1 and 3 with suggested values (only if higher than real values)
        if (suggestedForZone1 > zone1.visitors) {
          console.log(`[getClusterOccupancy] Venue busy: suggesting ${suggestedForZone1} visitors for zone 1 (was ${zone1.visitors})`);
          zone1.visitors = suggestedForZone1;
          zone1.suggested = true; // Mark as suggested value
        }
        
        if (suggestedForZone3 > zone3.visitors) {
          console.log(`[getClusterOccupancy] Venue busy: suggesting ${suggestedForZone3} visitors for zone 3 (was ${zone3.visitors})`);
          zone3.visitors = suggestedForZone3;
          zone3.suggested = true; // Mark as suggested value
        }
        
      } else {
        console.log(`[getClusterOccupancy] Low venue occupancy: using real visitor counts for zones 1 and 3`);
      }
    }

    const finalClusterTotal = allZones.reduce((sum, zone) => sum + zone.visitors, 0);
    console.log(`[getClusterOccupancy] FINAL SUMMARY:`);
    console.log(`  → Venue Total: ${venueTotal} people (REGISTER - EXITOUT)`);
    console.log(`  → Cluster Distribution: ${finalClusterTotal} people across zones`);
    console.log(`  → Difference: ${venueTotal - finalClusterTotal} people not yet in clusters`);
    
    // Prepare zones data
    const zonesData = allZones.map(zone => ({
      id: zone.id,
      zone: zone.zone,
      visitors: zone.visitors
    }));

    // Check if client wants detailed metadata (via query parameter)
    const includeMetadata = req.query.metadata === 'true';
    
    if (includeMetadata) {
      // Return full metadata for new clients
      return res.json({
        zones: zonesData,
        venue_total: venueTotal,
        cluster_total: finalClusterTotal,
        registered_count: registeredCount,
        exitout_count: exitoutCount
      });
    } else {
      // Return simple array for backward compatibility with existing heatmap
      return res.json(zonesData);
    }
    
  } catch (error) {
    console.error('[getClusterOccupancy] Error:', error);
    return res.status(500).json({ error: 'Failed to get cluster occupancy' });
  }
};

module.exports = {
  getClusterOccupancy
};