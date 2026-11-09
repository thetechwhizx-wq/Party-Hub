/**
 * survival-inventory/index.js — Survival Inventory / Apocalypse Vault
 * Party Hub game module
 *
 * Buy limited survival gear under a $100 budget to survive extreme catastrophes.
 */

import { Sound } from '../../core/audio.js';

const DISASTERS = [
  {
    title: '🏝️ Stranded Pacific Atoll',
    desc: 'Shipwrecked on a remote uncharted coral reef with a category 5 typhoon approaching.',
    essentialTags: ['water', 'shelter', 'signaling'],
  },
  {
    title: '☣️ Zombie Quarantine Breach',
    desc: 'Trapped in an infected metropolis surrounded by mutating hordes. 30 days to military extraction.',
    essentialTags: ['defense', 'medical', 'stealth'],
  },
  {
    title: '❄️ Sub-Zero Nuclear Winter',
    desc: 'Temperature drops to -40°C with toxic radioactive dust following a reactor cascade.',
    essentialTags: ['warmth', 'filtration', 'food'],
  },
];

const SURVIVAL_ITEMS = [
  { id: 'water-filter', name: 'Nano Water Purifier', cost: 20, tag: 'water', rating: 95, icon: '💧' },
  { id: 'firesteel', name: 'Ferrocerium Firestarter', cost: 15, tag: 'warmth', rating: 90, icon: '🔥' },
  { id: 'thermal-tent', name: '4-Season Mylar Shelter', cost: 25, tag: 'shelter', rating: 92, icon: '⛺' },
  { id: 'trauma-kit', name: 'Paramedic Trauma Kit', cost: 20, tag: 'medical', rating: 88, icon: '🩹' },
  { id: 'sat-beacon', name: 'Satellite SOS Beacon', cost: 35, tag: 'signaling', rating: 99, icon: '📡' },
  { id: 'machete', name: 'Carbon Steel Machete', cost: 20, tag: 'defense', rating: 85, icon: '🗡️' },
  { id: 'rations', name: '30-Day Emergency MREs', cost: 25, tag: 'food', rating: 94, icon: '🥫' },
  { id: 'gas-mask', name: 'CBRN Gas Mask & Filters', cost: 25, tag: 'filtration', rating: 96, icon: '🤿' },
  { id: 'solar-radio', name: 'Solar Emergency Radio', cost: 15, tag: 'signaling', rating: 80, icon: '📻' },
  { id: 'crossbow', name: 'Hunting Crossbow & Bolts', cost: 30, tag: 'defense', rating: 91, icon: '🏹' },
  { id: 'climbing-rope', name: 'Kevlar Rope & Harness', cost: 15, tag: 'utility', rating: 78, icon: '🪢' },
  { id: 'fishing-kit', name: 'Compact Survival Fishing Kit', cost: 10, tag: 'food', rating: 82, icon: '🎣' },
];

export const SurvivalInventoryModule = {
  metadata: {
    id: 'survival-inventory',
    title: 'Survival Inventory',
    subtitle: 'Apocalypse Vault Challenge',
    category: 'Battle & Survival',
    description: 'Spend $100 on survival tools to endure catastrophic disasters! Deep survival probability simulation.',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '5–8 min',
    emoji: '🎒',
    tags: ['survival', 'inventory', 'disaster-sim'],
  },

  createInitialState(config, players) {
    const disaster = DISASTERS[Math.floor(Math.random() * DISASTERS.length)];
    const inventories = {};
    const budgets = {};
    players.forEach(p => {
      inventories[p.id] = [];
      budgets[p.id] = 100;
    });

    return {
      phase: 'shopping',
      disaster,
      players,
      inventories,
      budgets,
      version: 0,
    };
  },

  validateAction(state, action, playerId) {
    if (state.phase !== 'shopping') return { valid: false, reason: 'Shopping closed' };
    const item = SURVIVAL_ITEMS.find(i => i.id === action.itemId);
    if (!item) return { valid: false, reason: 'Invalid item' };

    const myInv = state.inventories[playerId] || [];
    if (myInv.includes(item.id)) return { valid: false, reason: 'Already in backpack' };
    if (myInv.length >= 5) return { valid: false, reason: 'Backpack limit is 5 items' };

    const budget = state.budgets[playerId] ?? 0;
    if (item.cost > budget) return { valid: false, reason: `Need $${item.cost}, only $${budget} left` };

    return { valid: true };
  },

  applyAction(state, action, playerId) {
    const item = SURVIVAL_ITEMS.find(i => i.id === action.itemId);
    const newInv = [...(state.inventories[playerId] || []), item.id];
    const newBudget = (state.budgets[playerId] ?? 100) - item.cost;

    const newInventories = { ...state.inventories, [playerId]: newInv };
    const newBudgets = { ...state.budgets, [playerId]: newBudget };

    // Check if both players completed their 5 items
    const allDone = state.players.every(p => (newInventories[p.id] || []).length >= 5);

    return {
      ...state,
      inventories: newInventories,
      budgets: newBudgets,
      phase: allDone ? 'finished' : 'shopping',
    };
  },

  getNextPhase(state) {
    return state.phase;
  },

  calculateResults(state) {
    const disaster = state.disaster;
    const scores = {};
    const breakdowns = {};

    state.players.forEach(p => {
      const items = (state.inventories[p.id] || []).map(id => SURVIVAL_ITEMS.find(i => i.id === id)).filter(Boolean);
      let matchBonus = 0;
      items.forEach(i => {
        if (disaster.essentialTags.includes(i.tag)) matchBonus += 20;
      });

      const gearRating = items.reduce((s, i) => s + i.rating, 0) / Math.max(1, items.length);
      const survivalChance = Math.min(99, Math.round(gearRating * 0.6 + matchBonus * 0.4));

      scores[p.id] = survivalChance;
      breakdowns[p.id] = { survivalChance, items };
    });

    const entries = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const isTie = entries.length > 1 && entries[0][1] === entries[1][1];
    const winnerId = isTie ? null : entries[0][0];

    return {
      winnerId,
      isTie,
      scores,
      breakdowns,
      headline: isTie ? 'BOTH SURVIVORS TIED!' : `${state.players.find(p => p.id === winnerId)?.displayName || 'Player'} SURVIVES!`,
    };
  },

  isComplete(state) {
    return state.phase === 'finished';
  },

  renderLobby(container) {
    container.innerHTML = `
      <div class="game-settings-panel">
        <p class="text-sm text-secondary">
          A disaster scenario is rolled. You have $100 budget to pack 5 life-saving items. The Apocalypse Engine calculates your survival probability!
        </p>
      </div>
    `;
  },

  renderGame(container, context) {
    const { state, localPlayerId, players, onAction } = context;
    if (state.phase === 'finished') {
      this.renderResults(container, context);
      return;
    }

    const myInv = state.inventories[localPlayerId] || [];
    const myBudget = state.budgets[localPlayerId] ?? 100;

    container.innerHTML = `
      <div class="survival-view">
        <div class="scenario-banner">
          <h2 class="text-xl font-bold">${escapeHtml(state.disaster.title)}</h2>
          <p class="text-sm text-secondary">${escapeHtml(state.disaster.desc)}</p>
          <div class="flex gap-2 mt-2">
            <span class="text-xs text-muted">Key Needs:</span>
            ${state.disaster.essentialTags.map(t => `<span class="badge badge-orange">${t}</span>`).join('')}
          </div>
        </div>

        <div class="squad-header mt-5">
          <span class="font-bold">🎒 YOUR BACKPACK (${myInv.length}/5 Items)</span>
          <span class="budget-badge">💰 $${myBudget} Remaining</span>
        </div>

        <!-- Catalog -->
        <div class="entity-grid mt-4">
          ${SURVIVAL_ITEMS.map(item => {
            const inBag = myInv.includes(item.id);
            const canAfford = item.cost <= myBudget && myInv.length < 5;
            return `
              <div class="entity-card ${inBag ? 'my-pick' : ''}">
                <div style="font-size:2rem;text-align:center;">${item.icon}</div>
                <div class="entity-name font-bold mt-2">${escapeHtml(item.name)}</div>
                <div class="entity-meta mt-1">
                  <span class="tag">${item.tag}</span>
                  <span class="font-bold text-orange">$${item.cost}</span>
                </div>
                ${!inBag && canAfford ? `
                  <button class="btn btn-primary btn-sm buy-gear-btn mt-3" data-id="${item.id}">Buy Item</button>
                ` : inBag ? `
                  <span class="text-xs text-green font-bold mt-2">EQUIPPED</span>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.buy-gear-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.playBid();
        onAction({ itemId: btn.dataset.id });
      });
    });
  },

  renderResults(container, context) {
    const { state, localPlayerId, players } = context;
    const res = this.calculateResults(state);
    Sound.playVictory();

    container.innerHTML = `
      <div class="results-screen">
        <div class="winner-banner">
          <div class="winner-trophy">🏕️</div>
          <div class="winner-name">${escapeHtml(res.headline)}</div>
        </div>

        <div class="score-breakdown-grid mt-6">
          ${players.map(p => {
            const chance = res.scores[p.id] || 0;
            return `
              <div class="score-player-panel">
                <span class="font-bold">${escapeHtml(p.displayName)}</span>
                <div class="stat-number text-green mt-2">${chance}% Survival Rate</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="results-actions mt-6">
          <a href="#lobby" class="btn btn-primary btn-lg">Back to Lobby</a>
        </div>
      </div>
    `;
  },
};
