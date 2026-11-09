/**
 * index.js — Budget Draft game module
 * Party Hub game
 *
 * Implements the full game module contract:
 *   metadata, createInitialState, validateAction, applyAction,
 *   getNextPhase, calculateResults, isComplete,
 *   renderLobby, renderGame, renderResults
 */

import { BudgetDraftRules, DEFAULT_CONFIG } from './rules.js';
import { TOPIC_META } from './data/pools.js';
import { getAvatarInitials } from '../../core/player-manager.js';
import { CountdownTimer } from '../../shared/timer.js';

/** Avatar color palette (10 colors) for entity initials */
const ENTITY_COLORS = [
  '#58a6ff','#bc8cff','#f97316','#3fb950','#f85149',
  '#f5c842','#22d3ee','#fb7185','#a3e635','#c084fc',
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
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tierBadgeClass(tier) {
  return { S: 'tier-s', A: 'tier-a', B: 'tier-b', C: 'tier-c' }[tier] || 'badge-grey';
}

/** Active timers (cleaned up on re-render) */
let _activeTimer = null;

export const BudgetDraftModule = {
  metadata: {
    id: 'budget-draft',
    title: 'Budget Draft',
    subtitle: 'Build the Better Team',
    category: 'Draft & Build',
    description: 'Build the strongest team with a fixed budget. Pick wisely — every choice counts!',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '10–15 min',
    thumbnail: null,
    emoji: '💰',
    tags: ['strategy', 'draft', 'sports', 'pop-culture'],
    topics: ['cricket', 'football', 'superheroes', 'anime', 'pokemon', 'actors', 'villains'],
    modes: ['Snake Draft', 'Simultaneous Pick'],
  },

  // ----------------------------------------------------------------
  // State machine (delegates to rules.js)
  // ----------------------------------------------------------------

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

  /**
   * Render game settings in the lobby.
   * @param {HTMLElement} container
   * @param {{ settings: object, onSettingsChange: Function, isHost: boolean }} context
   */
  renderLobby(container, context) {
    const settings = { ...DEFAULT_CONFIG, ...context.settings };
    const isHost = context.isHost;

    const topicsHtml = Object.entries(TOPIC_META)
      .map(([key, meta]) => `
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
          <label class="form-label">Topic</label>
          <div class="topic-selector">${topicsHtml}</div>
        </div>

        <div class="settings-grid">
          <div class="form-group">
            <label class="form-label">Budget 💰</label>
            <select class="select" id="bd-budget" ${!isHost ? 'disabled' : ''}>
              <option value="80" ${settings.budget === 80 ? 'selected' : ''}>80 coins</option>
              <option value="100" ${settings.budget === 100 ? 'selected' : ''}>100 coins</option>
              <option value="120" ${settings.budget === 120 ? 'selected' : ''}>120 coins</option>
              <option value="150" ${settings.budget === 150 ? 'selected' : ''}>150 coins</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Roster Size</label>
            <select class="select" id="bd-roster" ${!isHost ? 'disabled' : ''}>
              <option value="3" ${settings.rosterSize === 3 ? 'selected' : ''}>3 picks</option>
              <option value="5" ${settings.rosterSize === 5 ? 'selected' : ''}>5 picks</option>
              <option value="7" ${settings.rosterSize === 7 ? 'selected' : ''}>7 picks</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Draft Mode</label>
            <select class="select" id="bd-mode" ${!isHost ? 'disabled' : ''}>
              <option value="snake" ${settings.selectionMode === 'snake' ? 'selected' : ''}>Snake Draft</option>
              <option value="simultaneous" ${settings.selectionMode === 'simultaneous' ? 'selected' : ''}>Simultaneous</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Time Per Pick</label>
            <select class="select" id="bd-timer" ${!isHost ? 'disabled' : ''}>
              <option value="0" ${settings.timePerPick === 0 ? 'selected' : ''}>No limit</option>
              <option value="15" ${settings.timePerPick === 15 ? 'selected' : ''}>15 seconds</option>
              <option value="30" ${settings.timePerPick === 30 ? 'selected' : ''}>30 seconds</option>
              <option value="60" ${settings.timePerPick === 60 ? 'selected' : ''}>60 seconds</option>
            </select>
          </div>
        </div>

        ${!isHost ? '<p class="text-xs text-muted" style="text-align:center;margin-top:8px">Only the host can change settings</p>' : ''}
      </div>
    `;

    if (!isHost) return;

    // Wire up topic buttons
    container.querySelectorAll('.topic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.topic = btn.dataset.topic;
        container.querySelectorAll('.topic-btn').forEach(b => b.classList.toggle('active', b.dataset.topic === settings.topic));
        context.onSettingsChange?.({ ...settings });
      });
    });

    // Wire up selects
    const wire = (id, key, transform = v => v) => {
      const el = container.querySelector(`#${id}`);
      if (el) {
        el.addEventListener('change', () => {
          settings[key] = transform(el.value);
          context.onSettingsChange?.({ ...settings });
        });
      }
    };

    wire('bd-budget', 'budget', Number);
    wire('bd-roster', 'rosterSize', Number);
    wire('bd-mode', 'selectionMode');
    wire('bd-timer', 'timePerPick', Number);
  },

  // ----------------------------------------------------------------
  // Game UI
  // ----------------------------------------------------------------

  /**
   * Render the main game board.
   * @param {HTMLElement} container
   * @param {{ state: object, localPlayerId: string, players: object[], isHost: boolean, onAction: Function }} context
   */
  renderGame(container, context) {
    const { state, localPlayerId, players } = context;
    if (!state) {
      container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Waiting for game state…</p></div>';
      return;
    }

    // Stop any active timer
    if (_activeTimer) { _activeTimer.stop(); _activeTimer = null; }

    const available = BudgetDraftRules.getAvailableEntities(state);
    const myTurn = state.config.selectionMode === 'snake' && state.currentTurn === localPlayerId;
    const isSim = state.config.selectionMode === 'simultaneous';
    const isMyTurnEffective = myTurn || isSim;

    const myBudget = state.budgets[localPlayerId] ?? 0;

    // Turn indicator text
    let turnText = '';
    if (state.config.selectionMode === 'snake') {
      if (state.currentTurn === localPlayerId) {
        turnText = '⚡ Your Turn — Pick an entity!';
      } else {
        const oppPlayer = players.find(p => p.id === state.currentTurn);
        turnText = `⏳ Waiting for ${oppPlayer?.displayName ?? 'opponent'}…`;
      }
    } else {
      turnText = '🎯 Simultaneous Pick — Choose your entities!';
    }

    const turnClass = isMyTurnEffective ? 'my-turn' : (isSim ? 'simultaneous' : 'opp-turn');

    container.innerHTML = `
      <div class="game-view" style="margin-top:0;min-height:0;">
        <!-- Game Header -->
        <div class="game-header">
          <div class="game-header-left">
            <span class="game-title-sm">💰 Budget Draft</span>
            <span class="game-phase-badge phase-picking">Picking Phase</span>
          </div>
          <div class="game-header-right">
            <div class="turn-indicator ${turnClass}" id="turn-indicator">${escapeHtml(turnText)}</div>
            ${state.config.timePerPick > 0 ? `
              <div id="timer-container">
                <div class="timer-display">
                  <span class="timer-value" id="timer-value">${state.config.timePerPick}</span>
                  <span class="timer-label">sec</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Budget Draft Layout -->
        <div class="budget-draft-layout">
          <!-- Entity Pool -->
          <div class="pool-panel">
            <div class="pool-header">
              <span class="pool-title">${TOPIC_META[state.config.topic]?.icon || '🎲'} ${TOPIC_META[state.config.topic]?.label || state.config.topic} Pool</span>
              <span class="pool-count">${available.length} available</span>
            </div>
            <div class="entity-grid" id="entity-grid">
              ${this._renderEntityGrid(available, state, localPlayerId, myBudget, isMyTurnEffective)}
            </div>
          </div>

          <!-- Team Panels -->
          <div class="team-panels" id="team-panels">
            ${players.map(player => this._renderTeamPanel(player, state, localPlayerId)).join('')}
          </div>
        </div>
      </div>
    `;

    // Wire pick buttons
    container.querySelectorAll('.entity-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const entityId = btn.dataset.entityId;
        if (entityId) context.onAction?.({ entityId });
      });
    });

    // Start timer if applicable
    if (state.config.timePerPick > 0 && isMyTurnEffective) {
      const timerEl = container.querySelector('#timer-value');
      if (timerEl) {
        _activeTimer = new CountdownTimer(
          state.config.timePerPick,
          (remaining) => {
            if (timerEl) {
              timerEl.textContent = remaining;
              if (remaining <= 10) timerEl.classList.add('urgent');
            }
          },
          () => {
            // Auto-pick cheapest available entity when time runs out
            const cheapest = [...available].sort((a, b) => a.value - b.value)
              .find(e => e.value <= myBudget);
            if (cheapest) context.onAction?.({ entityId: cheapest.id });
          }
        );
        _activeTimer.start();
      }
    }
  },

  _renderEntityGrid(available, state, localPlayerId, myBudget, isMyTurn) {
    const allPicked = Object.values(state.picks).flat();

    // Also render picked entities (dimmed)
    const pickedByMe = state.picks[localPlayerId] || [];
    const pickedByOpp = Object.entries(state.picks)
      .filter(([id]) => id !== localPlayerId)
      .flatMap(([, picks]) => picks);

    // Combine all pool entities (available + picked) for display
    const all = state.pool;

    return all.map(entity => {
      const isPickedByMe = pickedByMe.includes(entity.id);
      const isPickedByOpp = pickedByOpp.includes(entity.id);
      const isPicked = isPickedByMe || isPickedByOpp;
      const canAfford = entity.value <= myBudget;
      const canPick = isMyTurn && !isPicked && canAfford;

      const initials = getAvatarInitials(entity.name);
      const color = entityColor(entity.id);

      let cardClass = 'entity-card';
      if (isPickedByMe) cardClass += ' my-pick';
      else if (isPickedByOpp) cardClass += ' opp-pick';
      else if (isPicked) cardClass += ' picked';

      return `
        <div class="${cardClass}" data-entity-id="${entity.id}">
          <div class="entity-avatar" style="background:${color}">
            ${escapeHtml(initials)}
          </div>
          <div class="entity-name">${escapeHtml(entity.name)}</div>
          <div class="entity-role">${escapeHtml(entity.role)}</div>
          <div class="entity-meta">
            <span class="badge ${tierBadgeClass(entity.tier)}">${entity.tier}</span>
            <span class="entity-value"><span class="entity-value-icon">💰</span>${entity.value}</span>
          </div>
          ${canPick ? `
            <button class="entity-pick-btn" data-entity-id="${entity.id}" aria-label="Pick ${entity.name}">
              Pick
            </button>
          ` : !isPicked && isMyTurn && !canAfford ? `
            <div style="font-size:0.65rem;color:var(--accent-red);margin-top:4px;">Can't afford</div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  _renderTeamPanel(player, state, localPlayerId) {
    const isMe = player.id === localPlayerId;
    const picks = BudgetDraftRules.getPlayerTeam(state, player.id);
    const remaining = state.budgets[player.id] ?? state.config.budget;
    const spent = state.config.budget - remaining;
    const spentPct = Math.round((spent / state.config.budget) * 100);
    const initials = getAvatarInitials(player.displayName);
    const rosterSize = state.config.rosterSize;

    // Build pick rows
    const pickRows = picks.map(entity => {
      const eInitials = getAvatarInitials(entity.name);
      const eColor = entityColor(entity.id);
      return `
        <div class="team-pick-row team-pick-row-new">
          <div class="team-pick-avatar" style="background:${eColor}">${escapeHtml(eInitials)}</div>
          <span class="team-pick-name">${escapeHtml(entity.name)}</span>
          <span class="badge ${tierBadgeClass(entity.tier)}">${entity.tier}</span>
          <span class="team-pick-cost">💰${entity.value}</span>
        </div>
      `;
    }).join('');

    // Empty slots
    const emptySlots = Array.from({ length: Math.max(0, rosterSize - picks.length) })
      .map((_, i) => `<div class="team-pick-slot">Empty slot ${picks.length + i + 1}</div>`)
      .join('');

    return `
      <div class="team-panel ${isMe ? 'my-team' : 'opp-team'}">
        <div class="team-panel-header">
          <div class="team-panel-name">
            <div class="player-avatar player-avatar-sm" style="background:${player.color}">${escapeHtml(initials)}</div>
            ${escapeHtml(player.displayName)}${isMe ? ' (You)' : ''}
          </div>
          <div class="budget-display">
            <span class="budget-remaining">💰${remaining}</span>
            <span class="budget-label">remaining</span>
          </div>
        </div>
        <div class="team-panel-picks">
          ${pickRows}
          ${emptySlots}
        </div>
        <div class="team-budget-bar">
          <div class="progress-bar">
            <div class="progress-fill progress-fill-orange" style="width:${spentPct}%"></div>
          </div>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------------------
  // Results UI
  // ----------------------------------------------------------------

  /**
   * Render results screen.
   * @param {HTMLElement} container
   * @param {{ state: object, results: object, localPlayerId: string, players: object[], onRematch: Function, onLeave: Function }} context
   */
  renderResults(container, context) {
    if (_activeTimer) { _activeTimer.stop(); _activeTimer = null; }

    const { state, results, localPlayerId, players, onRematch, onLeave } = context;
    const { winnerId, isTie, scores, breakdown } = results;

    const winnerPlayer = winnerId ? players.find(p => p.id === winnerId) : null;
    const isMeWinner = winnerId === localPlayerId;

    // Build winner banner
    let bannerContent = '';
    if (isTie) {
      bannerContent = `
        <div class="winner-trophy">🤝</div>
        <div class="winner-label">It's a Tie!</div>
        <div class="winner-name">Both teams were equally matched</div>
        <div class="winner-subtitle">Great draft from both sides!</div>
      `;
    } else if (winnerPlayer) {
      bannerContent = `
        <div class="winner-trophy">🏆</div>
        <div class="winner-label">Winner</div>
        <div class="winner-name">${escapeHtml(winnerPlayer.displayName)}${isMeWinner ? ' 🎉' : ''}</div>
        <div class="winner-subtitle">${isMeWinner ? 'Outstanding draft strategy!' : 'Better luck next time!'}</div>
      `;
    }

    // Build player score panels
    const playerPanels = players.map(player => {
      const isWinner = player.id === winnerId;
      const isMe = player.id === localPlayerId;
      const totalScore = scores[player.id] ?? 0;
      const playerBreakdown = breakdown[player.id];
      const initials = getAvatarInitials(player.displayName);

      const picksHtml = (playerBreakdown?.picks || []).map(pick => `
        <div class="result-row">
          <div style="width:24px;height:24px;border-radius:50%;background:${entityColor(pick.id)};display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:800;color:white;flex-shrink:0;">${escapeHtml(getAvatarInitials(pick.name))}</div>
          <span class="result-row-name">${escapeHtml(pick.name)}</span>
          <span class="badge ${tierBadgeClass(pick.tier)}">${pick.tier}</span>
          <span class="result-row-score">+${pick.points}pts</span>
        </div>
      `).join('');

      const detailsHtml = (playerBreakdown?.details || []).map(d => `
        <div class="score-detail-row">
          <span class="score-detail-label">${escapeHtml(d.label)}</span>
          <span class="score-detail-value">${escapeHtml(String(d.value))}</span>
        </div>
      `).join('');

      return `
        <div class="score-player-panel${isWinner ? ' winner' : ''}">
          <div class="score-player-header">
            <div class="flex items-center gap-3">
              <div style="width:40px;height:40px;border-radius:50%;background:${player.color};display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:white;">${escapeHtml(initials)}</div>
              <div>
                <div class="font-semibold">${escapeHtml(player.displayName)}${isMe ? ' <span class="text-muted text-sm">(You)</span>' : ''}</div>
                ${isWinner ? '<div class="badge badge-green" style="margin-top:2px">🏆 Winner</div>' : ''}
              </div>
            </div>
            <div class="score-total">${totalScore}pts</div>
          </div>
          <div class="score-player-picks">${picksHtml}</div>
          <div>${detailsHtml}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="results-screen">
        <div class="winner-banner${isTie ? ' tie-banner' : ''}">
          ${bannerContent}
        </div>

        <div class="score-breakdown" style="width:100%">
          <div class="score-breakdown-title">📊 Score Breakdown</div>
          <div class="score-breakdown-grid">
            ${playerPanels}
          </div>
        </div>

        <div class="results-actions">
          <button class="btn btn-primary btn-lg" id="rematch-btn">🔄 Rematch</button>
          <button class="btn btn-ghost btn-lg" id="leave-btn">Leave Room</button>
        </div>
      </div>
    `;

    container.querySelector('#rematch-btn')?.addEventListener('click', onRematch);
    container.querySelector('#leave-btn')?.addEventListener('click', onLeave);
  },

  /**
   * Render the reveal phase (teams shown before results).
   * @param {HTMLElement} container
   * @param {object} context
   */
  renderReveal(container, context) {
    if (_activeTimer) { _activeTimer.stop(); _activeTimer = null; }

    const { state, players, localPlayerId } = context;

    const revealPanels = players.map(player => {
      const isMe = player.id === localPlayerId;
      const initials = getAvatarInitials(player.displayName);
      const team = BudgetDraftRules.getPlayerTeam(state, player.id);

      const entityRows = team.map((e, i) => `
        <div class="reveal-entity-card" style="animation-delay:${i * 0.1}s">
          <div style="width:36px;height:36px;border-radius:50%;background:${entityColor(e.id)};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:white;flex-shrink:0;">${escapeHtml(getAvatarInitials(e.name))}</div>
          <div class="reveal-entity-info">
            <div class="reveal-entity-name">${escapeHtml(e.name)}</div>
            <div class="reveal-entity-role">${escapeHtml(e.role)}</div>
          </div>
          <span class="badge ${tierBadgeClass(e.tier)}">${e.tier}</span>
          <span class="entity-value"><span class="entity-value-icon">💰</span>${e.value}</span>
        </div>
      `).join('');

      return `
        <div class="reveal-team-panel">
          <div class="reveal-team-header">
            <div style="width:40px;height:40px;border-radius:50%;background:${player.color};display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:white;">${escapeHtml(initials)}</div>
            <div>
              <div class="font-semibold">${escapeHtml(player.displayName)}${isMe ? ' (You)' : ''}</div>
              <div class="text-xs text-muted">Budget remaining: 💰${state.budgets[player.id] ?? 0}</div>
            </div>
          </div>
          <div class="reveal-team-picks">${entityRows}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:var(--space-6) var(--space-4);">
        <div class="text-center mb-6">
          <h2 class="gradient-text" style="font-size:1.5rem;margin-bottom:8px;">🎭 Team Reveal!</h2>
          <p class="text-secondary">See what everyone drafted…</p>
        </div>
        <div class="reveal-container">
          ${revealPanels}
        </div>
        <div style="display:flex;justify-content:center;margin-top:var(--space-6);">
          <button class="btn btn-primary btn-lg" id="reveal-results-btn">📊 See Results</button>
        </div>
      </div>
    `;

    container.querySelector('#reveal-results-btn')?.addEventListener('click', () => {
      context.onRevealComplete?.();
    });
  },

  /**
   * Clean up timers, etc.
   */
  destroy() {
    if (_activeTimer) { _activeTimer.stop(); _activeTimer = null; }
  },
};
