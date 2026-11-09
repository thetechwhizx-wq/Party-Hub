/**
 * rules.js — Budget Draft rules engine and state machine
 * Party Hub game module
 */

import { POOLS } from './data/pools.js';
import { TIER_POINTS, determineWinner } from '../../core/scoring.js';

/** Default game configuration */
export const DEFAULT_CONFIG = {
  budget: 100,
  rosterSize: 5,
  selectionMode: 'snake', // 'snake' | 'simultaneous'
  topic: 'cricket',
  timePerPick: 30, // seconds, 0 = no limit
};

/**
 * Fisher-Yates shuffle (creates a copy, does not mutate).
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build snake draft turn order for N rounds and P players.
 * e.g., 2 players, 5 rounds = [p0,p1,p1,p0,p0,p1,p1,p0,p0,p1]
 * @param {string[]} playerIds
 * @param {number} rounds
 * @returns {string[]}
 */
function buildSnakeTurnOrder(playerIds, rounds) {
  const order = [];
  for (let r = 0; r < rounds; r++) {
    const roundOrder = r % 2 === 0 ? [...playerIds] : [...playerIds].reverse();
    order.push(...roundOrder);
  }
  return order;
}

export const BudgetDraftRules = {
  DEFAULT_CONFIG,

  /**
   * Create the initial game state.
   * @param {object} config - Merged with DEFAULT_CONFIG
   * @param {object[]} players - Array of { id, displayName, color }
   * @returns {object} Initial state
   */
  createInitialState(config, players) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // Get pool for topic
    const rawPool = POOLS[cfg.topic] || POOLS.cricket;
    // Shuffle and slice to 30 entities (or all if fewer)
    const poolSize = Math.min(rawPool.length, 30);
    const pool = shuffle(rawPool).slice(0, poolSize);

    // Build budgets
    const budgets = {};
    const picks = {};
    players.forEach(p => {
      budgets[p.id] = cfg.budget;
      picks[p.id] = [];
    });

    // Build turn order for snake mode
    const playerIds = players.map(p => p.id);
    const turnOrder = cfg.selectionMode === 'snake'
      ? buildSnakeTurnOrder(playerIds, cfg.rosterSize)
      : [];

    return {
      phase: 'picking',
      config: cfg,
      pool,
      picks,
      budgets,
      currentTurn: cfg.selectionMode === 'snake' ? (playerIds[0] || null) : null,
      turnOrder,
      turnIndex: 0,
      roundNumber: 1,
      version: 0,
      startedAt: Date.now(),
    };
  },

  /**
   * Validate a pick action.
   * @param {object} state
   * @param {{ entityId: string }} action
   * @param {string} playerId
   * @returns {{ valid: boolean, reason?: string }}
   */
  validateAction(state, action, playerId) {
    if (!action || !action.entityId) {
      return { valid: false, reason: 'Missing entityId in action' };
    }

    // Phase check
    if (state.phase !== 'picking') {
      return { valid: false, reason: `Cannot pick in phase: ${state.phase}` };
    }

    // Turn check (snake mode)
    if (state.config.selectionMode === 'snake') {
      if (state.currentTurn !== playerId) {
        return { valid: false, reason: 'Not your turn' };
      }
    }

    // Entity must be in pool
    const entity = state.pool.find(e => e.id === action.entityId);
    if (!entity) {
      return { valid: false, reason: 'Entity not in pool' };
    }

    // Entity must not already be picked
    const allPicked = Object.values(state.picks).flat();
    if (allPicked.includes(action.entityId)) {
      return { valid: false, reason: 'Entity already picked' };
    }

    // Roster not full
    const myPicks = state.picks[playerId] || [];
    if (myPicks.length >= state.config.rosterSize) {
      return { valid: false, reason: 'Roster is full' };
    }

    // Budget check
    const remaining = state.budgets[playerId] ?? 0;
    if (entity.value > remaining) {
      return { valid: false, reason: `Insufficient budget (need ${entity.value}, have ${remaining})` };
    }

    return { valid: true };
  },

  /**
   * Apply a pick action to state (immutable).
   * @param {object} state
   * @param {{ entityId: string }} action
   * @param {string} playerId
   * @returns {object} New state
   */
  applyAction(state, action, playerId) {
    const entity = state.pool.find(e => e.id === action.entityId);
    if (!entity) return state;

    // Update picks
    const newPicks = {
      ...state.picks,
      [playerId]: [...(state.picks[playerId] || []), action.entityId],
    };

    // Update budget
    const newBudgets = {
      ...state.budgets,
      [playerId]: state.budgets[playerId] - entity.value,
    };

    // Advance turn (snake mode)
    let newTurnIndex = state.turnIndex;
    let newCurrentTurn = state.currentTurn;

    if (state.config.selectionMode === 'snake') {
      newTurnIndex = state.turnIndex + 1;
      newCurrentTurn = newTurnIndex < state.turnOrder.length
        ? state.turnOrder[newTurnIndex]
        : null;
    }

    const newState = {
      ...state,
      picks: newPicks,
      budgets: newBudgets,
      turnIndex: newTurnIndex,
      currentTurn: newCurrentTurn,
    };

    // Check phase transition
    return this._checkPhaseTransition(newState);
  },

  /**
   * Check if any players have filled their rosters.
   * @param {object} state
   * @returns {object} Possibly updated state
   */
  _checkPhaseTransition(state) {
    const playerIds = Object.keys(state.picks);
    const rosterSize = state.config.rosterSize;

    // All players have full rosters?
    const allDone = playerIds.every(id => (state.picks[id] || []).length >= rosterSize);
    if (allDone) {
      return { ...state, phase: 'reveal' };
    }

    // Simultaneous: check if this player just finished
    if (state.config.selectionMode === 'simultaneous') {
      // If a player has no affordable entities, auto-advance
      // (handled in UI/game module)
    }

    return state;
  },

  /**
   * Calculate results from final state.
   * @param {object} state
   * @returns {{ winnerId: string|null, isTie: boolean, scores: object, breakdown: object }}
   */
  calculateResults(state) {
    const playerIds = Object.keys(state.picks);
    const scores = {};
    const breakdown = {};

    for (const playerId of playerIds) {
      const pickedIds = state.picks[playerId] || [];
      const entities = pickedIds.map(id => state.pool.find(e => e.id === id)).filter(Boolean);

      // Tier score
      const tierScore = entities.reduce((sum, e) => sum + (TIER_POINTS[e.tier] || 0), 0);

      // Budget efficiency bonus (remaining budget)
      const remaining = state.budgets[playerId] ?? 0;
      const spent = state.config.budget - remaining;
      const efficiencyBonus = Math.floor(remaining * 0.5);

      // Role diversity bonus
      const roles = new Set(entities.map(e => e.role));
      const diversityBonus = (roles.size - 1) * 2;

      const total = tierScore + efficiencyBonus + diversityBonus;
      scores[playerId] = total;

      breakdown[playerId] = {
        picks: entities.map(e => ({
          id: e.id,
          name: e.name,
          tier: e.tier,
          value: e.value,
          role: e.role,
          points: TIER_POINTS[e.tier] || 0,
        })),
        details: [
          { label: 'Tier Score', value: `${tierScore}pts` },
          { label: 'Budget Remaining', value: `${remaining} coins` },
          { label: 'Efficiency Bonus', value: `+${efficiencyBonus}pts` },
          { label: 'Role Diversity Bonus', value: `+${diversityBonus}pts` },
          { label: 'Total', value: `${total}pts` },
        ],
      };
    }

    const { winnerId, isTie } = determineWinner(scores);

    return {
      winnerId,
      isTie,
      scores,
      breakdown,
    };
  },

  /**
   * Check if the game is complete.
   * @param {object} state
   * @returns {boolean}
   */
  isComplete(state) {
    return state.phase === 'reveal' || state.phase === 'scoring' || state.phase === 'finished';
  },

  /**
   * Get whose turn it is.
   * @param {object} state
   * @returns {string|null} playerId
   */
  getCurrentTurnPlayer(state) {
    if (state.config.selectionMode === 'snake') {
      return state.currentTurn;
    }
    return null; // simultaneous
  },

  /**
   * Get available (unpicked) entities from pool.
   * @param {object} state
   * @returns {object[]}
   */
  getAvailableEntities(state) {
    const allPicked = Object.values(state.picks).flat();
    return state.pool.filter(e => !allPicked.includes(e.id));
  },

  /**
   * Get entities for a player's team.
   * @param {object} state
   * @param {string} playerId
   * @returns {object[]}
   */
  getPlayerTeam(state, playerId) {
    const pickedIds = state.picks[playerId] || [];
    return pickedIds.map(id => state.pool.find(e => e.id === id)).filter(Boolean);
  },
};
