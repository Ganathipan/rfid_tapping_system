/**
 * ExitOut Stack Service
 * 
 * Manages an in-memory stack of cards that have been tapped on EXITOUT
 * instead of immediately processing them. This allows for bulk release
 * operations to reduce database writes and improve performance.
 */

const pool = require('../db/pool');
const { decCrowd } = require('./venueState');

// In-memory stack: Map<registrationId, Set<tagId>>
const exitoutStack = new Map();

/**
 * After adding a card to EXITOUT stack, determine if the entire team has exited.
 * If yes: remove team score (so they vanish from eligibility list) and optionally
 * clean up other lite artifacts (we ONLY drop score per current requirement).
 */
async function maybeFinalizeTeamExit(registrationId) {
  try {
    // Get all member cards for this team (active members still in members table)
    const { rows } = await pool.query(
      `SELECT rfid_card_id FROM members WHERE registration_id = $1`,
      [registrationId]
    );
    if (rows.length === 0) return; // No members to compare (already cleaned?)
    const allCards = rows.map(r => r.rfid_card_id);
    const stackSet = exitoutStack.get(registrationId);
    if (!stackSet) return;
    // Entire team exited when every member card has tapped EXITOUT (in stack)
    const allExited = allCards.every(c => stackSet.has(c));
    if (!allExited) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Delete score row; leave registration & members (could be re-used later) or optionally prune visits.
      await client.query(`DELETE FROM team_scores_lite WHERE registration_id = $1`, [registrationId]);
      await client.query('COMMIT');
      console.log(`[ExitOut Stack] Team ${registrationId} fully exited. Removed team_scores_lite row.`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[ExitOut Stack] Failed to finalize team exit cleanup:', e.message);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[ExitOut Stack] maybeFinalizeTeamExit error:', e.message);
  }
}

/**
 * Add a card to the exitout stack for a specific team
 * IMMEDIATELY reduces venue crowd count when card taps EXITOUT
 * @param {string} registrationId - The team's registration ID
 * @param {string} tagId - The RFID card ID to add to stack
 */
async function addToStack(registrationId, tagId) {
  if (!exitoutStack.has(registrationId)) {
    exitoutStack.set(registrationId, new Set());
  }
  
  const teamStack = exitoutStack.get(registrationId);
  
  // Check if this card is already in the stack (avoid double-counting)
  if (teamStack.has(tagId)) {
    console.log(`[ExitOut Stack] Card ${tagId} already in stack for team ${registrationId}, not adding again`);
    return {
      registrationId,
      tagId,
      stackSize: teamStack.size,
      alreadyInStack: true,
      timestamp: new Date().toISOString()
    };
  }
  
  teamStack.add(tagId);
  
  console.log(`[ExitOut Stack] Added ${tagId} to stack for team ${registrationId}. Stack size: ${teamStack.size}`);
  
  // IMMEDIATELY reduce venue crowd count by 1 when card taps EXITOUT
  try {
    console.log(`[ExitOut Stack] Immediately reducing venue crowd by 1 for EXITOUT tap of ${tagId}`);
    const newCrowdCount = await decCrowd(1);
    console.log(`[ExitOut Stack] Venue crowd reduced to ${newCrowdCount} due to EXITOUT tap`);
  } catch (venueError) {
    console.error(`[ExitOut Stack] Failed to immediately reduce venue crowd for EXITOUT:`, venueError);
    // Don't fail the stack operation due to venue count error, but log it
  }
  // After adding, see if entire team has exited
  maybeFinalizeTeamExit(registrationId);
  
  return {
    registrationId,
    tagId,
    stackSize: teamStack.size,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get the current exitout stack with counts per team
 * @returns {Array} Array of {registrationId, cardCount, cards, lastUpdated}
 */
function getStack() {
  const stackData = [];
  
  for (const [registrationId, cards] of exitoutStack.entries()) {
    if (cards.size > 0) {
      stackData.push({
        registrationId,
        cardCount: cards.size,
        cards: Array.from(cards),
        lastUpdated: new Date().toISOString()
      });
    }
  }
  
  // Sort by registration ID for consistent display (handle both string and number IDs)
  stackData.sort((a, b) => {
    const aId = String(a.registrationId);
    const bId = String(b.registrationId);
    return aId.localeCompare(bId);
  });
  
  return stackData;
}

/**
 * Release all cards in the stack for a specific team
 * Performs database operations to remove cards, clear team state, etc.
 * @param {string} registrationId - The team's registration ID
 * @returns {Object} Release operation result
 */
async function releaseAll(registrationId) {
  // Handle both string and number registration IDs for backward compatibility
  let teamStack = exitoutStack.get(registrationId);
  let actualRegId = registrationId;
  
  if (!teamStack) {
    // Try with number conversion in case it was stored as number
    const numericId = Number(registrationId);
    if (!isNaN(numericId)) {
      teamStack = exitoutStack.get(numericId);
      if (teamStack) {
        actualRegId = numericId;
      }
    }
  }
  
  if (!teamStack) {
    // Try with string conversion in case it was stored as string
    const stringId = String(registrationId);
    teamStack = exitoutStack.get(stringId);
    if (teamStack) {
      actualRegId = stringId;
    }
  }
  
  if (!teamStack || teamStack.size === 0) {
    return {
      registrationId,
      released: 0,
      cards: [],
      status: 'no_cards_in_stack'
    };
  }
  
  const cardsToRelease = Array.from(teamStack);
  console.log(`[ExitOut Stack] Releasing ${cardsToRelease.length} cards for team ${registrationId}:`, cardsToRelease);
  
  const client = await pool.connect();
  const releaseResults = [];
  
  try {
    await client.query('BEGIN');
    
    // Release each card in the stack
    for (const tagId of cardsToRelease) {
      try {
        await releaseTag(client, tagId, 'EXITOUT_STACK');
        releaseResults.push({
          tagId,
          status: 'released',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`[ExitOut Stack] Error releasing tag ${tagId}:`, error);
        releaseResults.push({
          tagId,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    await client.query('COMMIT');
    
    // Clear the team's stack after successful release (use the actual key that was found)
    exitoutStack.delete(actualRegId);
    
    const successCount = releaseResults.filter(r => r.status === 'released').length;
    const errorCount = releaseResults.filter(r => r.status === 'error').length;
    
    console.log(`[ExitOut Stack] Released ${successCount} cards successfully, ${errorCount} errors for team ${registrationId}`);
    
    // NOTE: Venue crowd count was already reduced when cards were added to stack (in addToStack)
    // So we DON'T reduce it again here to avoid double-counting
    console.log(`[ExitOut Stack] Released ${successCount} cards, but NOT reducing venue count (already reduced when added to stack)`);
    
    if (successCount > 0) {
      try {
        const { getCurrentCrowd } = require('./venueState');
        const currentCount = await getCurrentCrowd();
        console.log(`[ExitOut Stack] Current venue crowd after release (no change expected): ${currentCount}`);
      } catch (venueError) {
        console.error(`[ExitOut Stack] Could not get current venue count:`, venueError);
      }
    }
    
    return {
      registrationId,
      released: successCount,
      errors: errorCount,
      cards: releaseResults,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[ExitOut Stack] Transaction error for team ${registrationId}:`, error);
    
    return {
      registrationId,
      released: 0,
      errors: cardsToRelease.length,
      cards: cardsToRelease.map(tagId => ({
        tagId,
        status: 'error',
        error: error.message
      })),
      status: 'transaction_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    client.release();
  }
}

/**
 * Helper function to release a single tag (copied from tags.js)
 * @param {*} client - Database client
 * @param {string} tagId - RFID card ID
 * @param {string} portal - Portal identifier
 */
async function releaseTag(client, tagId, portal) {
  await lockOrCreateCard(client, tagId, portal);
  // Delete all members with this card (regardless of portal)
  await client.query(`DELETE FROM members WHERE rfid_card_id=$1`, [tagId]);
  await client.query(`UPDATE rfid_cards SET status='released' WHERE rfid_card_id=$1`, [tagId]);
}

/**
 * Helper function to lock or create card (copied from tags.js)
 * @param {*} client - Database client
 * @param {string} tagId - RFID card ID
 * @param {string} portal - Portal identifier
 */
async function lockOrCreateCard(client, tagId, portal) {
  // Try to lock the existing card
  const lockResult = await client.query(
    `UPDATE rfid_cards SET portal = $1 WHERE rfid_card_id = $2 RETURNING rfid_card_id`,
    [portal, tagId]
  );
  
  if (lockResult.rowCount === 0) {
    // Card doesn't exist, create it
    await client.query(
      `INSERT INTO rfid_cards (rfid_card_id, status, portal) VALUES ($1, 'released', $2)
       ON CONFLICT (rfid_card_id) DO UPDATE SET portal = $2`,
      [tagId, portal]
    );
  }
}

/**
 * Get stack statistics
 * @returns {Object} Overall stack statistics
 */
function getStackStats() {
  const totalTeams = exitoutStack.size;
  let totalCards = 0;
  
  for (const cards of exitoutStack.values()) {
    totalCards += cards.size;
  }
  
  return {
    totalTeams,
    totalCards,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear the entire stack (useful for debugging/admin operations)
 * @returns {Object} Clear operation result
 */
function clearStack() {
  const stats = getStackStats();
  exitoutStack.clear();
  
  console.log(`[ExitOut Stack] Cleared entire stack. Previous stats:`, stats);
  
  return {
    ...stats,
    status: 'cleared',
    clearedAt: new Date().toISOString()
  };
}

module.exports = {
  addToStack,
  getStack,
  releaseAll,
  getStackStats,
  clearStack
};