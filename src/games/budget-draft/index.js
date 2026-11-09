/**
 * index.js — Budget Draft & Live Auction Showdown Module
 * Party Hub game
 *
 * Implements the full YouTube challenge format:
 * - Live Auction Showdown with real-time bidding wars
 * - Alternate Snake Draft
 * - Head-to-Head Simulation Engine (Football match, Cricket clash, Arena duels)
 */

import { BudgetDraftRules, DEFAULT_CONFIG } from './rules.js';
import { TOPIC_META } from './data/pools.js';
import { getAvatarInitials } from '../../core/player-manager.js';
import { Sound } from '../../core/audio.js';

const ENTITY_COLORS = [
  '#58a6ff', '#bc8cff', '#f97316', '#3fb950', '#f85149',
  '#f5c842', '#22d3ee', '#fb7185', '#a3e635', '#c084fc',
];

function entityColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return ENTITY_COLORS[Math.abs(hash) % ENTITY_COLORS.length];
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tierBadgeClass(tier) {
  return { S: 'tier-s', A: 'tier-a', B: 'tier-b', C: 'tier-c' }[tier] || 'badge-grey';
}

let _auctionInterval = null;

export const BudgetDraftModule = {
  metadata: {
    id: 'budget-draft',
    title: 'Auction & Squad Clash',
    subtitle: 'Who Builds the Better Squad?',
    category: 'Draft & Build',
    description: 'Real-time bidding wars & tactical team drafts, followed by an epic head-to-head match simulation!',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '8–12 min',
    thumbnail: null,
    emoji: '🔨',
    tags: ['auction', 'squad-builder', 'simulation', 'youtube-format'],
    topics: ['cricket', 'football', 'superheroes', 'anime', 'pokemon', 'actors', 'villains'],
    modes: ['Live Auction', 'Snake Draft'],
  },

  createInitialState(config, players) {
    return BudgetDraftRules.createInitialState(config, players);
  },

  validateAction(state, action, playerId) {
    return BudgetDraftRules.validateAction(state, action, playerId);
  },

  applyAction(state, action, playerId) {
    return BudgetDraftRules.applyAction(state, action, playerId);
  },

  getNextPhase(state) {
    if (BudgetDraftRules.isComplete(state)) return 'finished';
    return state.phase;
  },

  calculateResults(state) {
    return BudgetDraftRules.calculateResults(state);
  },

  isComplete(state) {
    return BudgetDraftRules.isComplete(state);
  },

  // ----------------------------------------------------------------
  // Lobby UI
  // ----------------------------------------------------------------

  renderLobby(container, context) {
    const settings = { ...DEFAULT_CONFIG, ...context.settings };
    const isHost = context.isHost;

    const topicsHtml = Object.entries(TOPIC_META).map(([key, meta]) => `
      <button class="topic-btn${settings.topic === key ? ' active' : ''}"
              data-topic="${key}"
              ${!isHost ? 'disabled' : ''}
              aria-pressed="${settings.topic === key}">
        <span class="topic-btn-icon">${meta.icon}</span>
        <span class="topic-btn-label">${meta.label}</span>
      </button>
    `).join('');

    container.innerHTML = `
      <div class="game-settings-panel">
        <div class="form-group">
          <label class="form-label">Category / Universe</label>
          <div class="topic-selector">${topicsHtml}</div>
        </div>

        <div class="settings-grid">
          <div class="form-group">
            <label class="form-label">Game Mode</label>
            <select class="select" id="bd-mode" ${!isHost ? 'disabled' : ''}>
              <option value="auction" ${settings.selectionMode === 'auction' ? 'selected' : ''}>🔨 Live Auction Showdown</option>
              <option value="snake" ${settings.selectionMode === 'snake' ? 'selected' : ''}>🐍 Traditional Snake Draft</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Team Budget 💰</label>
            <select class="select" id="bd-budget" ${!isHost ? 'disabled' : ''}>
              <option value="80" ${settings.budget === 80 ? 'selected' : ''}>$80 Million</option>
              <option value="100" ${settings.budget === 100 ? 'selected' : ''}>$100 Million (Standard)</option>
              <option value="120" ${settings.budget === 120 ? 'selected' : ''}>$120 Million</option>
              <option value="150" ${settings.budget === 150 ? 'selected' : ''}>$150 Million (Galacticos)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Squad Roster Size</label>
            <select class="select" id="bd-roster" ${!isHost ? 'disabled' : ''}>
              <option value="3" ${settings.rosterSize === 3 ? 'selected' : ''}>3 Picks (Fast)</option>
              <option value="5" ${settings.rosterSize === 5 ? 'selected' : ''}>5 Picks (Standard YT)</option>
              <option value="7" ${settings.rosterSize === 7 ? 'selected' : ''}>7 Picks (Deep)</option>
            </select>
          </div>
        </div>
      </div>
    `;

    if (!isHost) return;

    container.querySelectorAll('.topic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.topic = btn.dataset.topic;
        container.querySelectorAll('.topic-btn').forEach(b => b.classList.toggle('active', b.dataset.topic === settings.topic));
        context.onSettingsChange?.({ ...settings });
      });
    });

    const wire = (id, key, transform = v => v) => {
      const el = container.querySelector(`#${id}`);
      if (el) {
        el.addEventListener('change', () => {
          settings[key] = transform(el.value);
          context.onSettingsChange?.({ ...settings });
        });
      }
    };

    wire('bd-mode', 'selectionMode');
    wire('bd-budget', 'budget', Number);
    wire('bd-roster', 'rosterSize', Number);
  },

  // ----------------------------------------------------------------
  // Game UI
  // ----------------------------------------------------------------

  renderGame(container, context) {
    const { state, localPlayerId, players, onAction, isHost } = context;
    if (!state) return;

    if (state.phase === 'simulation') {
      this.renderSimulation(container, context);
      return;
    }

    if (state.config.selectionMode === 'auction') {
      this._renderAuctionShowdown(container, context);
    } else {
      this._renderSnakeDraft(container, context);
    }
  },

  // ---- LIVE AUCTION SHOWDOWN ----
  _renderAuctionShowdown(container, context) {
    const { state, localPlayerId, players, onAction, isHost } = context;
    const lot = state.currentLot;
    if (!lot) return;

    const myBudget = state.budgets[localPlayerId] ?? 0;
    const myPicks = state.picks[localPlayerId] || [];
    const isRosterFull = myPicks.length >= state.config.rosterSize;
    const hasPassed = state.passedPlayers.includes(localPlayerId);
    const isHighestBidder = state.highestBidder === localPlayerId;

    const highestBidderPlayer = players.find(p => p.id === state.highestBidder);
    const minNextBid = state.highestBidder ? state.currentBid + 1 : state.currentBid;

    container.innerHTML = `
      <div class="auction-arena">
        <!-- Top Status Banner -->
        <div class="auction-header">
          <div class="flex items-center gap-3">
            <span class="badge badge-orange font-bold">🔨 AUCTION LOT ${state.lotIndex + 1} / ${state.pool.length}</span>
            <span class="text-sm text-secondary">${TOPIC_META[state.config.topic]?.icon || ''} ${TOPIC_META[state.config.topic]?.label || ''}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted">Roster Limit: ${state.config.rosterSize} Picks</span>
          </div>
        </div>

        <div class="auction-grid">
          <!-- Left: My Squad Panel -->
          <div class="squad-panel my-squad">
            <div class="squad-header">
              <span class="font-bold text-sm">👤 YOUR SQUAD (${myPicks.length}/${state.config.rosterSize})</span>
              <span class="budget-badge">💰 $${myBudget}M</span>
            </div>
            <div class="squad-list">
              ${this._renderSquadPicks(myPicks, state.pool)}
            </div>
          </div>

          <!-- Center: Auction Spotlight Block -->
          <div class="auction-block">
            <div class="lot-card" style="border-top: 4px solid ${entityColor(lot.id)};">
              <div class="lot-avatar" style="background:${entityColor(lot.id)};">
                ${getAvatarInitials(lot.name)}
              </div>
              <h2 class="lot-name">${escapeHtml(lot.name)}</h2>
              <div class="lot-tags">
                <span class="badge ${tierBadgeClass(lot.tier)}">${lot.tier} TIER</span>
                <span class="tag">${escapeHtml(lot.role)}</span>
                <span class="text-xs text-muted">Value: $${lot.value}M</span>
              </div>

              <!-- Current Bid Callout -->
              <div class="bid-callout">
                <div class="text-xs text-muted uppercase tracking-wider">CURRENT HIGH BID</div>
                <div class="bid-amount">$${state.currentBid}M</div>
                <div class="bidder-status">
                  ${state.highestBidder
                    ? `Held by <strong style="color:var(--accent-blue)">${escapeHtml(highestBidderPlayer?.displayName || 'Opponent')}</strong>`
                    : 'Opening base bid'
                  }
                </div>
              </div>

              <!-- Auction Action Controls -->
              <div class="auction-controls">
                ${isRosterFull ? `
                  <div class="status-pill text-muted">Squad Full (${myPicks.length}/${state.config.rosterSize})</div>
                ` : hasPassed ? `
                  <div class="status-pill text-red">Passed on this lot</div>
                ` : `
                  <div class="bid-button-group">
                    <button class="btn btn-primary bid-btn" data-amt="${minNextBid}" ${myBudget < minNextBid ? 'disabled' : ''}>
                      Bid $${minNextBid}M
                    </button>
                    <button class="btn btn-primary bid-btn" data-amt="${state.currentBid + 3}" ${myBudget < state.currentBid + 3 ? 'disabled' : ''}>
                      +$3M
                    </button>
                    <button class="btn btn-primary bid-btn" data-amt="${state.currentBid + 5}" ${myBudget < state.currentBid + 5 ? 'disabled' : ''}>
                      +$5M
                    </button>
                  </div>
                  <button class="btn btn-ghost pass-btn" id="pass-lot-btn">
                    ✋ Pass Lot
                  </button>
                `}
              </div>
            </div>

            <!-- Recent Auction Activity Feed -->
            <div class="auction-ticker">
              <span class="text-xs font-semibold text-muted">AUCTION LOG:</span>
              ${state.lotHistory.slice(0, 3).map(h => `
                <span class="ticker-item">
                  ${h.status === 'SOLD' ? `✅ ${escapeHtml(h.entity.name)} → $${h.price}M` : `❌ ${escapeHtml(h.entity.name)} passed`}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Right: Opponent Squad Panel -->
          <div class="squad-panel opp-squad">
            ${players.filter(p => p.id !== localPlayerId).map(opp => `
              <div class="squad-header">
                <span class="font-bold text-sm">⚔️ ${escapeHtml(opp.displayName)} (${(state.picks[opp.id] || []).length}/${state.config.rosterSize})</span>
                <span class="budget-badge">💰 $${state.budgets[opp.id] ?? 0}M</span>
              </div>
              <div class="squad-list">
                ${this._renderSquadPicks(state.picks[opp.id] || [], state.pool)}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Button wiring
    container.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = Number(btn.dataset.amt);
        if (amt) {
          Sound.playBid();
          onAction({ type: 'BID', amount: amt });
        }
      });
    });

    container.querySelector('#pass-lot-btn')?.addEventListener('click', () => {
      onAction({ type: 'PASS' });
    });
  },

  // ---- TRADITIONAL SNAKE DRAFT ----
  _renderSnakeDraft(container, context) {
    const { state, localPlayerId, players, onAction } = context;
    const available = BudgetDraftRules.getAvailableEntities(state);
    const isMyTurn = state.currentTurn === localPlayerId;
    const myBudget = state.budgets[localPlayerId] ?? 0;

    container.innerHTML = `
      <div class="game-view">
        <div class="game-header">
          <span class="game-title-sm">🐍 Snake Draft Mode</span>
          <div class="turn-indicator ${isMyTurn ? 'my-turn' : 'opp-turn'}">
            ${isMyTurn ? '⚡ Your turn to pick!' : '⏳ Waiting for opponent pick...'}
          </div>
        </div>
        <div class="budget-draft-layout">
          <div class="pool-panel">
            <div class="pool-header">
              <span>Pool (${available.length} available)</span>
              <span>Your Budget: $${myBudget}M</span>
            </div>
            <div class="entity-grid">
              ${available.map(e => `
                <div class="entity-card" data-id="${e.id}">
                  <div class="entity-avatar" style="background:${entityColor(e.id)}">${getAvatarInitials(e.name)}</div>
                  <div class="entity-name">${escapeHtml(e.name)}</div>
                  <div class="entity-role">${escapeHtml(e.role)}</div>
                  <div class="entity-meta">
                    <span class="badge ${tierBadgeClass(e.tier)}">${e.tier}</span>
                    <span class="entity-value">💰$${e.value}M</span>
                  </div>
                  ${isMyTurn && e.value <= myBudget ? `
                    <button class="entity-pick-btn snake-pick-btn" data-id="${e.id}">Pick</button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div class="team-panels">
            ${players.map(p => `
              <div class="team-panel ${p.id === localPlayerId ? 'my-team' : 'opp-team'}">
                <div class="team-panel-header">
                  <span>${escapeHtml(p.displayName)}</span>
                  <span>💰$${state.budgets[p.id] ?? 0}M</span>
                </div>
                <div class="team-panel-picks">
                  ${this._renderSquadPicks(state.picks[p.id] || [], state.pool)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.snake-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.playBid();
        onAction({ type: 'PICK', entityId: btn.dataset.id });
      });
    });
  },

  _renderSquadPicks(pickIds, pool) {
    if (!pickIds || pickIds.length === 0) {
      return '<div class="empty-slot-msg">No picks yet</div>';
    }
    return pickIds.map(id => {
      const entity = pool.find(e => e.id === id);
      if (!entity) return '';
      return `
        <div class="team-pick-row">
          <div class="team-pick-avatar" style="background:${entityColor(entity.id)}">
            ${getAvatarInitials(entity.name)}
          </div>
          <span class="team-pick-name">${escapeHtml(entity.name)}</span>
          <span class="badge ${tierBadgeClass(entity.tier)}">${entity.tier}</span>
          <span class="team-pick-cost">$${entity.value}M</span>
        </div>
      `;
    }).join('');
  },

  // ----------------------------------------------------------------
  // MATCH SIMULATION SCREEN (WHO BUILT THE BETTER SQUAD?)
  // ----------------------------------------------------------------

  renderSimulation(container, context) {
    const { state, players, localPlayerId, onAction } = context;
    const sim = BudgetDraftRules.calculateResults(state).simulation;
    const playerA = players[0];
    const playerB = players[1] || players[0];

    const teamA = BudgetDraftRules.getPlayerTeam(state, playerA.id);
    const teamB = BudgetDraftRules.getPlayerTeam(state, playerB.id);

    const isMeWinner = sim.winnerId === localPlayerId;
    if (isMeWinner) Sound.playVictory(); else Sound.playGoal();

    container.innerHTML = `
      <div class="simulation-screen">
        <div class="sim-scoreboard">
          <div class="sim-headline">🏆 MATCH SIMULATION RESULT</div>
          <h1 class="sim-score">${escapeHtml(sim.headline)}</h1>
          <p class="sim-subheadline">${escapeHtml(sim.subheadline)}</p>
        </div>

        <!-- Head to Head Rosters Comparison -->
        <div class="sim-teams-grid">
          <div class="sim-team-box ${sim.winnerId === playerA.id ? 'sim-winner' : ''}">
            <div class="sim-team-title">
              <span class="font-bold">${escapeHtml(playerA.displayName)}</span>
              <span class="badge ${sim.winnerId === playerA.id ? 'badge-green' : 'badge-grey'}">
                ${sim.winnerId === playerA.id ? 'WINNER 👑' : 'FINALIST'}
              </span>
            </div>
            <div class="sim-picks">
              ${teamA.map(p => `
                <div class="sim-pick-pill">
                  <span class="badge ${tierBadgeClass(p.tier)}">${p.tier}</span>
                  <span>${escapeHtml(p.name)}</span>
                  <span class="text-xs text-muted">(${escapeHtml(p.role)})</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="sim-team-box ${sim.winnerId === playerB.id ? 'sim-winner' : ''}">
            <div class="sim-team-title">
              <span class="font-bold">${escapeHtml(playerB.displayName)}</span>
              <span class="badge ${sim.winnerId === playerB.id ? 'badge-green' : 'badge-grey'}">
                ${sim.winnerId === playerB.id ? 'WINNER 👑' : 'FINALIST'}
              </span>
            </div>
            <div class="sim-picks">
              ${teamB.map(p => `
                <div class="sim-pick-pill">
                  <span class="badge ${tierBadgeClass(p.tier)}">${p.tier}</span>
                  <span>${escapeHtml(p.name)}</span>
                  <span class="text-xs text-muted">(${escapeHtml(p.role)})</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Simulation Commentary Log -->
        <div class="sim-log-box">
          <div class="sim-log-title">🎙️ SIMULATION CLASH COMMENTARY</div>
          <div class="sim-log-entries">
            ${sim.commentary.map(c => `
              <div class="sim-log-row ${c.type === 'GOAL' ? 'log-highlight' : ''}">
                <span class="sim-log-text">${escapeHtml(c.text)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Stats breakdown -->
        <div class="sim-stats-box">
          <div class="sim-log-title">📊 PERFORMANCE RATINGS</div>
          ${sim.stats.map(s => `
            <div class="sim-stat-row">
              <span class="stat-team-val">${s.valA}</span>
              <span class="stat-label-center">${s.label}</span>
              <span class="stat-team-val">${s.valB}</span>
            </div>
          `).join('')}
        </div>

        <div class="results-actions">
          <button class="btn btn-primary btn-lg" id="sim-rematch-btn">🔄 Rematch</button>
          <a href="#lobby" class="btn btn-ghost btn-lg">Back to Lobby</a>
        </div>
      </div>
    `;

    container.querySelector('#sim-rematch-btn')?.addEventListener('click', () => {
      window.location.hash = 'lobby';
    });
  },

  renderResults(container, context) {
    this.renderSimulation(container, context);
  },

  destroy() {
    if (_auctionInterval) {
      clearInterval(_auctionInterval);
      _auctionInterval = null;
    }
  },
};
