/**
 * rules.js — Budget Draft rules engine and state machine
 * Party Hub game module
 *
 * Supports YouTube Auction Draft (live bidding showdown) and Snake Draft,
 * with deep head-to-head match simulation to determine the winner.
 */

import { POOLS } from './data/pools.js';
import { runMatchSimulation } from './simulation.js';

/** Default game configuration */
export const DEFAULT_CONFIG = {
  budget: 100,
  rosterSize: 5,
  selectionMode: 'snake', // 'snake' | 'auction'
  topic: 'cricket',
  timePerPick: 30, // seconds
};

/** Fisher-Yates shuffle */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Snake turn order */
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
   * Create initial game state.
   */
  createInitialState(config, players) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const rawPool = POOLS[cfg.topic] || POOLS.cricket;
    const poolSize = Math.min(rawPool.length, 30);
    const pool = shuffle(rawPool).slice(0, poolSize);

    const budgets = {};
    const picks = {};
    players.forEach(p => {
      budgets[p.id] = cfg.budget;
      picks[p.id] = [];
    });

    const playerIds = players.map(p => p.id);
    const isAuction = cfg.selectionMode === 'auction';

    // First lot for auction
    const firstLot = isAuction && pool.length > 0 ? pool[0] : null;
    const baseBid = firstLot ? Math.max(3, Math.round(firstLot.value * 0.5)) : 5;

    return {
      phase: isAuction ? 'auction' : 'picking',
      config: cfg,
      pool,
      players,
      picks,
      budgets,
      // Snake draft properties
      currentTurn: !isAuction ? (playerIds[0] || null) : null,
      turnOrder: !isAuction ? buildSnakeTurnOrder(playerIds, cfg.rosterSize) : [],
      turnIndex: 0,
      // Auction properties
      lotIndex: 0,
      currentLot: firstLot,
      currentBid: baseBid,
      highestBidder: null,
      passedPlayers: [],
      lotTimer: 10,
      lotHistory: [], // record of past sales
      version: 0,
      startedAt: Date.now(),
    };
  },

  /**
   * Validate a player action.
   */
  validateAction(state, action, playerId) {
    if (!action) return { valid: false, reason: 'Empty action' };

    // Auction mode actions
    if (state.config.selectionMode === 'auction') {
      if (action.type === 'BID') {
        const amount = Number(action.amount);
        if (!amount || isNaN(amount)) return { valid: false, reason: 'Invalid bid amount' };
        if (amount <= state.currentBid && state.highestBidder !== null) {
          return { valid: false, reason: `Bid must exceed current bid of ${state.currentBid}` };
        }
        const playerBudget = state.budgets[playerId] ?? 0;
        if (amount > playerBudget) {
          return { valid: false, reason: `Insufficient budget ($${playerBudget} available)` };
        }
        const playerPicks = state.picks[playerId] || [];
        if (playerPicks.length >= state.config.rosterSize) {
          return { valid: false, reason: 'Your squad roster is already full!' };
        }
        if (state.passedPlayers.includes(playerId)) {
          return { valid: false, reason: 'You have already passed on this lot' };
        }
        return { valid: true };
      }

      if (action.type === 'PASS') {
        if (state.passedPlayers.includes(playerId)) {
          return { valid: false, reason: 'Already passed' };
        }
        return { valid: true };
      }

      if (action.type === 'ADVANCE_LOT') {
        return { valid: true };
      }
    }

    // Snake mode: entity pick action
    const entityId = action.entityId || action.id;
    if (!entityId) return { valid: false, reason: 'Missing entityId' };

    if (state.phase !== 'picking') {
      return { valid: false, reason: `Cannot pick in phase: ${state.phase}` };
    }

    if (state.config.selectionMode === 'snake' && state.currentTurn !== playerId) {
      return { valid: false, reason: 'Not your turn' };
    }

    const entity = state.pool.find(e => e.id === entityId);
    if (!entity) return { valid: false, reason: 'Entity not in pool' };

    const allPicked = Object.values(state.picks).flat();
    if (allPicked.includes(entityId)) return { valid: false, reason: 'Entity already picked' };

    const myPicks = state.picks[playerId] || [];
    if (myPicks.length >= state.config.rosterSize) return { valid: false, reason: 'Roster full' };

    const budget = state.budgets[playerId] ?? 0;
    if (entity.value > budget) {
      return { valid: false, reason: `Insufficient budget: Need ${entity.value}, have ${budget}` };
    }

    return { valid: true };
  },

  /**
   * Apply an action immutably.
   */
  applyAction(state, action, playerId) {
    // ---- AUCTION MODE ----
    if (state.config.selectionMode === 'auction') {
      if (action.type === 'BID') {
        const amount = Number(action.amount);
        return {
          ...state,
          currentBid: amount,
          highestBidder: playerId,
          lotTimer: 8, // Reset bidding clock to 8s
        };
      }

      if (action.type === 'PASS') {
        const newPassed = [...state.passedPlayers, playerId];
        const activePlayers = state.players.filter(p => {
          const picks = state.picks[p.id] || [];
          return picks.length < state.config.rosterSize;
        });

        // Check if all players (or all except highest bidder) passed
        const remainingToBid = activePlayers.filter(p => !newPassed.includes(p.id));

        if (remainingToBid.length === 0 || (state.highestBidder && remainingToBid.length <= 1 && remainingToBid[0]?.id === state.highestBidder)) {
          // Lot is SOLD or UNSOLD
          return this._resolveAuctionLot({ ...state, passedPlayers: newPassed });
        }

        return { ...state, passedPlayers: newPassed };
      }

      if (action.type === 'ADVANCE_LOT') {
        return this._resolveAuctionLot(state);
      }
    }

    // ---- SNAKE MODE ----
    const entityId = action.entityId || action.id;
    const entity = state.pool.find(e => e.id === entityId);
    if (!entity) return state;

    const newPicks = {
      ...state.picks,
      [playerId]: [...(state.picks[playerId] || []), entityId],
    };
    const newBudgets = {
      ...state.budgets,
      [playerId]: state.budgets[playerId] - entity.value,
    };

    let newTurnIndex = state.turnIndex + 1;
    let newCurrentTurn = newTurnIndex < state.turnOrder.length ? state.turnOrder[newTurnIndex] : null;

    const newState = {
      ...state,
      picks: newPicks,
      budgets: newBudgets,
      turnIndex: newTurnIndex,
      currentTurn: newCurrentTurn,
    };

    // Check if all players filled rosters
    const allDone = state.players.every(p => (newPicks[p.id] || []).length >= state.config.rosterSize);
    if (allDone) {
      return { ...newState, phase: 'reveal' };
    }

    return newState;
  },

  /**
   * Helper: Resolve current auction lot and move to next
   */
  _resolveAuctionLot(state) {
    let newPicks = { ...state.picks };
    let newBudgets = { ...state.budgets };
    const lotHistory = [...state.lotHistory];

    if (state.highestBidder && state.currentLot) {
      // Award lot to highest bidder
      const winnerId = state.highestBidder;
      newPicks[winnerId] = [...(newPicks[winnerId] || []), state.currentLot.id];
      newBudgets[winnerId] = Math.max(0, (newBudgets[winnerId] ?? 0) - state.currentBid);

      lotHistory.unshift({
        entity: state.currentLot,
        winnerId,
        price: state.currentBid,
        status: 'SOLD',
      });
    } else if (state.currentLot) {
      lotHistory.unshift({
        entity: state.currentLot,
        winnerId: null,
        price: 0,
        status: 'PASSED',
      });
    }

    // Check if all players have completed their squad
    const allSquadsComplete = state.players.every(p => (newPicks[p.id] || []).length >= state.config.rosterSize);
    if (allSquadsComplete) {
      return {
        ...state,
        picks: newPicks,
        budgets: newBudgets,
        lotHistory,
        phase: 'simulation',
      };
    }

    // Advance to next lot
    let nextIndex = state.lotIndex + 1;
    let nextLot = state.pool[nextIndex] || null;

    // Loop pool if exhausted but rosters still open
    if (!nextLot) {
      nextIndex = 0;
      nextLot = state.pool[0];
    }

    const baseBid = nextLot ? Math.max(3, Math.round(nextLot.value * 0.5)) : 5;

    return {
      ...state,
      picks: newPicks,
      budgets: newBudgets,
      lotIndex: nextIndex,
      currentLot: nextLot,
      currentBid: baseBid,
      highestBidder: null,
      passedPlayers: [],
      lotTimer: 10,
      lotHistory,
    };
  },

  /**
   * Calculate final results with head-to-head simulation engine
   */
  calculateResults(state) {
    const players = state.players;
    const playerA = players[0];
    const playerB = players[1] || players[0];

    const teamA = (state.picks[playerA.id] || [])
      .map(id => state.pool.find(e => e.id === id))
      .filter(Boolean);

    const teamB = (state.picks[playerB.id] || [])
      .map(id => state.pool.find(e => e.id === id))
      .filter(Boolean);

    // Run deep simulation
    const sim = runMatchSimulation(state.config.topic, teamA, teamB, playerA, playerB);

    const scores = {
      [playerA.id]: sim.winnerId === playerA.id ? 3 : 1,
      [playerB.id]: sim.winnerId === playerB.id ? 3 : 1,
    };

    const breakdown = {
      [playerA.id]: {
        picks: teamA.map(e => ({ name: e.name, tier: e.tier, role: e.role, value: e.value })),
        budgetRemaining: state.budgets[playerA.id] ?? 0,
      },
      [playerB.id]: {
        picks: teamB.map(e => ({ name: e.name, tier: e.tier, role: e.role, value: e.value })),
        budgetRemaining: state.budgets[playerB.id] ?? 0,
      },
    };

    return {
      winnerId: sim.winnerId,
      isTie: sim.isTie,
      scores,
      breakdown,
      simulation: sim,
    };
  },

  isComplete(state) {
    return state.phase === 'reveal' || state.phase === 'simulation' || state.phase === 'finished';
  },

  getAvailableEntities(state) {
    const allPicked = Object.values(state.picks).flat();
    return state.pool.filter(e => !allPicked.includes(e.id));
  },

  getPlayerTeam(state, playerId) {
    const pickedIds = state.picks[playerId] || [];
    return pickedIds.map(id => state.pool.find(e => e.id === id)).filter(Boolean);
  },
};
