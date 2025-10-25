/**
 * ExitOut Stack Routes
 * 
 * Provides REST API endpoints for managing the exitout stack system.
 * Mounted under /api/exitout
 */

const express = require('express');
const router = express.Router();
const exitoutStackService = require('../services/exitoutStackService');
const pool = require('../db/pool');

/**
 * GET /api/exitout/stack
 * Returns the current exitout stack with counts per team
 */
router.get('/stack', async (req, res) => {
  try {
    const stack = exitoutStackService.getStack();
    const stats = exitoutStackService.getStackStats();
    
    res.status(200).json({
      success: true,
      stack,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExitOut Routes] Error getting stack:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve exitout stack',
      message: error.message
    });
  }
});

/**
 * POST /api/exitout/release/:registrationId
 * Releases all cards in the stack for the specified team
 */
router.post('/release/:registrationId', async (req, res) => {
  const { registrationId } = req.params;
  
  if (!registrationId) {
    return res.status(400).json({
      success: false,
      error: 'Registration ID is required'
    });
  }
  
  try {
    const releaseResult = await exitoutStackService.releaseAll(registrationId);
    
    if (releaseResult.status === 'no_cards_in_stack') {
      return res.status(200).json({
        success: true,
        message: 'No cards in stack for this team',
        result: releaseResult
      });
    }
    
    if (releaseResult.status === 'transaction_failed') {
      return res.status(500).json({
        success: false,
        error: 'Failed to release cards due to database error',
        result: releaseResult
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Released ${releaseResult.released} cards for team ${registrationId}`,
      result: releaseResult
    });
    
  } catch (error) {
    console.error(`[ExitOut Routes] Error releasing cards for team ${registrationId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to release cards',
      message: error.message,
      registrationId
    });
  }
});

/**
 * GET /api/exitout/stats
 * Returns overall exitout stack statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = exitoutStackService.getStackStats();
    
    res.status(200).json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExitOut Routes] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve exitout statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/exitout/clear
 * Clears the entire exitout stack (admin operation)
 * WARNING: This will remove all stacked cards without processing them
 */
router.post('/clear', async (req, res) => {
  try {
    const clearResult = exitoutStackService.clearStack();
    
    res.status(200).json({
      success: true,
      message: 'Exitout stack cleared successfully',
      result: clearResult
    });
  } catch (error) {
    console.error('[ExitOut Routes] Error clearing stack:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear exitout stack',
      message: error.message
    });
  }
});

/**
 * GET /api/exitout/team/:registrationId
 * Returns the exitout stack for a specific team
 */
router.get('/team/:registrationId', async (req, res) => {
  const { registrationId } = req.params;
  
  if (!registrationId) {
    return res.status(400).json({
      success: false,
      error: 'Registration ID is required'
    });
  }
  
  try {
    const fullStack = exitoutStackService.getStack();
    const teamStack = fullStack.find(item => item.registrationId === registrationId);
    
    if (!teamStack) {
      return res.status(200).json({
        success: true,
        team: {
          registrationId,
          cardCount: 0,
          cards: [],
          lastUpdated: new Date().toISOString()
        }
      });
    }
    
    res.status(200).json({
      success: true,
      team: teamStack
    });
  } catch (error) {
    console.error(`[ExitOut Routes] Error getting team stack for ${registrationId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve team exitout stack',
      message: error.message,
      registrationId
    });
  }
});

/**
 * GET /api/exitout/test-crowd
 * Test endpoint to check current crowd count and venue state
 */
router.get('/test-crowd', async (req, res) => {
  try {
    const { getCurrentCrowd } = require('../services/venueState');
    const currentCrowd = await getCurrentCrowd();
    
    // Also get raw database data for comparison
    const dbResult = await pool.query('SELECT * FROM venue_state WHERE id = 1');
    
    // Get cluster totals for comparison
    const clusterResult = await pool.query(`
      SELECT 
        latest.label as zone_code,
        COUNT(*) as current_count
      FROM (
        SELECT DISTINCT ON (l.rfid_card_id) 
          l.rfid_card_id, 
          l.label, 
          l.log_time
        FROM logs l
        ORDER BY l.rfid_card_id, l.log_time DESC
      ) latest
      WHERE latest.label LIKE 'CLUSTER%'
      GROUP BY latest.label
      ORDER BY latest.label
    `);
    
    let clusterTotal = 0;
    const clusterBreakdown = {};
    for (const row of clusterResult.rows) {
      const count = Number(row.current_count);
      clusterTotal += count;
      clusterBreakdown[row.zone_code] = count;
    }
    
    // Get exitout stack info
    const exitoutStack = exitoutStackService.getStack();
    const exitoutStats = exitoutStackService.getStackStats();
    
    res.json({
      success: true,
      venueCrowd: currentCrowd,
      clusterTotal: clusterTotal,
      exitoutStack: {
        totalCards: exitoutStats.totalCards,
        totalTeams: exitoutStats.totalTeams,
        details: exitoutStack
      },
      clusterBreakdown,
      dbRaw: dbResult.rows[0] || null,
      analysis: {
        venueVsCluster: currentCrowd - clusterTotal,
        expectedDifference: exitoutStats.totalCards,
        isConsistent: (currentCrowd - clusterTotal) === exitoutStats.totalCards
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExitOut Routes] Error getting current crowd:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current crowd',
      message: error.message,
      details: {
        code: error.code,
        constraint: error.constraint
      }
    });
  }
});

/**
 * GET /api/exitout/debug-logs
 * Debug endpoint to check recent logs and latest taps per card
 */
router.get('/debug-logs', async (req, res) => {
  try {
    // Get latest tap per card
    const latestTapsResult = await pool.query(`
      SELECT DISTINCT ON (l.rfid_card_id) 
        l.rfid_card_id, 
        l.label, 
        l.log_time,
        l.portal,
        CASE WHEN l.label LIKE 'CLUSTER%' THEN 'CLUSTER' ELSE l.label END as category
      FROM logs l
      ORDER BY l.rfid_card_id, l.log_time DESC
      LIMIT 50
    `);
    
    // Get recent EXITOUT logs
    const exitoutLogsResult = await pool.query(`
      SELECT rfid_card_id, label, portal, log_time
      FROM logs
      WHERE label = 'EXITOUT' OR portal = 'EXITOUT'
      ORDER BY log_time DESC
      LIMIT 20
    `);
    
    // Count cards by latest tap type
    const summaryResult = await pool.query(`
      SELECT 
        CASE WHEN latest.label LIKE 'CLUSTER%' THEN 'CLUSTER' ELSE latest.label END as category,
        COUNT(*) as count
      FROM (
        SELECT DISTINCT ON (l.rfid_card_id) 
          l.rfid_card_id, 
          l.label
        FROM logs l
        ORDER BY l.rfid_card_id, l.log_time DESC
      ) latest
      GROUP BY CASE WHEN latest.label LIKE 'CLUSTER%' THEN 'CLUSTER' ELSE latest.label END
      ORDER BY count DESC
    `);
    
    res.json({
      success: true,
      latestTapsPerCard: latestTapsResult.rows,
      recentExitoutLogs: exitoutLogsResult.rows,
      summaryByCategory: summaryResult.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExitOut Routes] Error getting debug logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get debug logs',
      message: error.message
    });
  }
});

/**
 * POST /api/exitout/simulate/:registrationId
 * Simulates adding a card to the exitout stack for testing purposes
 * This is useful for development and testing
 */
router.post('/simulate/:registrationId', async (req, res) => {
  const { registrationId } = req.params;
  const { tagId } = req.body;
  
  if (!registrationId) {
    return res.status(400).json({
      success: false,
      error: 'Registration ID is required'
    });
  }
  
  if (!tagId) {
    return res.status(400).json({
      success: false,
      error: 'Tag ID is required in request body'
    });
  }
  
  try {
    const result = await exitoutStackService.addToStack(registrationId, tagId);
    
    res.status(200).json({
      success: true,
      message: `Added ${tagId} to exitout stack for team ${registrationId}`,
      result
    });
  } catch (error) {
    console.error(`[ExitOut Routes] Error simulating add to stack:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to add card to exitout stack',
      message: error.message
    });
  }
});

/**
 * GET /api/exitout/debug-totals
 * Debug endpoint to investigate high total counts
 */
router.get('/debug-totals', async (req, res) => {
  try {
    // Get venue state
    const { getCurrentCrowd } = require('../services/venueState');
    const venueCrowd = await getCurrentCrowd();
    
    // Get assigned cards count
    const assignedCardsResult = await pool.query(`
      SELECT COUNT(*) as total_assigned
      FROM rfid_cards 
      WHERE status = 'assigned'
    `);
    const maxTotalCards = Number(assignedCardsResult.rows[0]?.total_assigned || 0);
    
    // Get raw cluster counts from logs
    const clusterResult = await pool.query(`
      SELECT 
        latest.label as zone_code,
        COUNT(*) as current_count
      FROM (
        SELECT DISTINCT ON (l.rfid_card_id) 
          l.rfid_card_id, 
          l.label, 
          l.log_time
        FROM logs l
        ORDER BY l.rfid_card_id, l.log_time DESC
      ) latest
      WHERE latest.label LIKE 'CLUSTER%'
      GROUP BY latest.label
      ORDER BY latest.label
    `);
    
    let dbTotal = 0;
    const clusterBreakdown = {};
    clusterResult.rows.forEach(row => {
      const count = Number(row.current_count);
      dbTotal += count;
      clusterBreakdown[row.zone_code] = count;
    });
    
    // Get exitout stack stats
    const exitoutStats = exitoutStackService.getStackStats();
    
    // Check venue state table directly
    const venueStateResult = await pool.query('SELECT * FROM venue_state WHERE id = 1');
    const venueStateRaw = venueStateResult.rows[0];
    
    res.json({
      success: true,
      analysis: {
        venueCrowd: venueCrowd,
        dbClusterTotal: dbTotal,
        maxTotalCards: maxTotalCards,
        exitoutCards: exitoutStats.totalCards,
        difference: venueCrowd - dbTotal,
        isRealistic: venueCrowd <= 100 && dbTotal <= 100
      },
      breakdown: {
        clusterCounts: clusterBreakdown,
        exitoutStack: exitoutStats
      },
      rawData: {
        venueState: venueStateRaw,
        clusterRows: clusterResult.rows
      },
      warnings: {
        highVenueCrowd: venueCrowd > 100,
        highDbTotal: dbTotal > 100,
        hugeDifference: Math.abs(venueCrowd - dbTotal) > 50
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExitOut Routes] Error getting debug totals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get debug totals',
      message: error.message
    });
  }
});

/**
 * POST /api/exitout/simulate-tap
 * Simulates a complete EXITOUT tap including database logging
 * This is useful for testing the complete EXITOUT flow
 */
router.post('/simulate-tap', async (req, res) => {
  const { rfidCardId, portal = 'EXITOUT', registrationId } = req.body;
  
  if (!rfidCardId) {
    return res.status(400).json({
      success: false,
      error: 'RFID card ID is required in request body'
    });
  }
  
  try {
    // Simulate the complete EXITOUT tap process
    console.log(`[Simulate EXITOUT] Processing tap for card ${rfidCardId}`);
    
    // 1. Log the EXITOUT tap to database (like MQTT handler does)
    const logQuery = `
      INSERT INTO logs (log_time, rfid_card_id, portal, label)
      VALUES (NOW(), $1, $2, $3)
      RETURNING id, log_time, rfid_card_id, portal, label
    `;
    const logResult = await pool.query(logQuery, [rfidCardId, portal, 'EXITOUT']);
    
    // 2. Add to exitout stack
    let finalRegistrationId = registrationId;
    if (!finalRegistrationId) {
      // Look up registration ID like the MQTT handler does
      const lookupQuery = `
        SELECT m.registration_id 
        FROM members m 
        JOIN rfid_cards rc ON m.rfid_card_id = rc.rfid_card_id 
        WHERE rc.rfid_card_id = $1 
        LIMIT 1
      `;
      const lookupResult = await pool.query(lookupQuery, [rfidCardId]);
      
      if (lookupResult.rows.length > 0) {
        finalRegistrationId = lookupResult.rows[0].registration_id;
      } else {
        finalRegistrationId = 'UNKNOWN';
      }
    }
    
    const stackResult = await exitoutStackService.addToStack(String(finalRegistrationId), rfidCardId);
    
    // 3. Verify the log entry was created correctly
    const verifyQuery = `
      SELECT DISTINCT ON (l.rfid_card_id) 
        l.rfid_card_id, 
        l.label, 
        l.log_time
      FROM logs l
      WHERE l.rfid_card_id = $1
      ORDER BY l.rfid_card_id, l.log_time DESC
      LIMIT 1
    `;
    const verifyResult = await pool.query(verifyQuery, [rfidCardId]);
    
    res.status(200).json({
      success: true,
      message: `Simulated complete EXITOUT tap for ${rfidCardId}`,
      logEntry: logResult.rows[0],
      stackResult,
      latestTap: verifyResult.rows[0] || null,
      registrationId: finalRegistrationId
    });
  } catch (error) {
    console.error(`[Simulate EXITOUT] Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate EXITOUT tap',
      message: error.message
    });
  }
});

/**
 * GET /api/exitout/health
 * Quick health check for production monitoring (non-disruptive)
 */
router.get('/health', async (req, res) => {
  try {
    // Get basic counts without heavy processing
    const { getCurrentCrowd } = require('../services/venueState');
    const venueCrowd = await getCurrentCrowd();
    
    const exitoutStats = exitoutStackService.getStackStats();
    
    // Simple cluster count query
    const clusterCountResult = await pool.query(`
      SELECT COUNT(*) as cluster_cards
      FROM (
        SELECT DISTINCT ON (l.rfid_card_id) l.rfid_card_id, l.label
        FROM logs l
        ORDER BY l.rfid_card_id, l.log_time DESC
      ) latest
      WHERE latest.label LIKE 'CLUSTER%'
    `);
    
    const clusterCards = Number(clusterCountResult.rows[0]?.cluster_cards || 0);
    
    res.json({
      status: 'healthy',
      metrics: {
        venueCrowd: venueCrowd,
        clusterCards: clusterCards,
        exitoutCards: exitoutStats.totalCards,
        totalTracked: clusterCards + exitoutStats.totalCards
      },
      alerts: {
        highVenueCrowd: venueCrowd > 100,
        highClusterCount: clusterCards > 80,
        largeDifference: Math.abs(venueCrowd - clusterCards) > 20
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExitOut Health] Error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/exitout/card-history/:cardId
 * NEW FEATURE: Get complete tap history for a specific RFID card
 * Example: /api/exitout/card-history/ABC123?limit=50
 */
router.get('/card-history/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
  
  if (!cardId) {
    return res.status(400).json({
      success: false,
      error: 'Card ID is required'
    });
  }
  
  try {
    // Get complete tap history for this card
    const historyQuery = `
      SELECT 
        l.log_time,
        l.label,
        l.portal,
        l.id as log_id,
        CASE 
          WHEN l.label LIKE 'CLUSTER%' THEN 'CLUSTER_VISIT'
          WHEN l.label = 'REGISTER' THEN 'REGISTRATION'
          WHEN l.label = 'EXITOUT' THEN 'EXIT'
          ELSE 'OTHER'
        END as event_type
      FROM logs l
      WHERE l.rfid_card_id = $1
      ORDER BY l.log_time DESC
      LIMIT $2
    `;
    
    const historyResult = await pool.query(historyQuery, [cardId, limit]);
    
    // Get card details and current status
    const cardQuery = `
      SELECT 
        rc.rfid_card_id,
        rc.status,
        rc.portal,
        rc.created_at as card_created,
        m.registration_id,
        m.created_at as member_since,
        r.team_name,
        r.group_size
      FROM rfid_cards rc
      LEFT JOIN members m ON rc.rfid_card_id = m.rfid_card_id
      LEFT JOIN registration r ON m.registration_id = r.id
      WHERE rc.rfid_card_id = $1
    `;
    
    const cardResult = await pool.query(cardQuery, [cardId]);
    
    // Calculate statistics
    const stats = {
      totalTaps: historyResult.rows.length,
      clusterVisits: historyResult.rows.filter(r => r.event_type === 'CLUSTER_VISIT').length,
      registrations: historyResult.rows.filter(r => r.event_type === 'REGISTRATION').length,
      exits: historyResult.rows.filter(r => r.event_type === 'EXIT').length,
      firstSeen: historyResult.rows.length > 0 ? historyResult.rows[historyResult.rows.length - 1].log_time : null,
      lastSeen: historyResult.rows.length > 0 ? historyResult.rows[0].log_time : null
    };
    
    // Get unique clusters visited
    const clustersVisited = [...new Set(
      historyResult.rows
        .filter(r => r.event_type === 'CLUSTER_VISIT')
        .map(r => r.label)
    )];
    
    res.json({
      success: true,
      cardId: cardId,
      cardDetails: cardResult.rows[0] || null,
      statistics: stats,
      clustersVisited: clustersVisited,
      history: historyResult.rows,
      pagination: {
        limit: limit,
        returned: historyResult.rows.length,
        hasMore: historyResult.rows.length === limit
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[Card History] Error getting history for ${cardId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve card history',
      message: error.message,
      cardId
    });
  }
});

module.exports = router;