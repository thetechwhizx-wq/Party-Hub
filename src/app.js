/**
 * app.js — Party Hub application bootstrap
 * SPA entry point: initialises all systems, wires up routing and UI
 */

import { EventBus } from './core/event-bus.js';
import { Persistence } from './core/persistence.js';
import { PlayerManager } from './core/player-manager.js';
import { GameRegistry } from './core/game-registry.js';
import { MultiplayerTransport } from './core/multiplayer.js';
import { RoomManager } from './core/room-manager.js';
import { GameLifecycle } from './core/game-lifecycle.js';

import { BudgetDraftModule } from './games/budget-draft/index.js';
import { FiveVsFiveModule } from './games/five-vs-five/index.js';
import { PopularityBattleModule } from './games/popularity-battle/index.js';
import { BlindRankingModule } from './games/blind-ranking/index.js';
import { SurvivalInventoryModule } from './games/survival-inventory/index.js';
import { CounterPickModule } from './games/counter-pick/index.js';
import { Sound } from './core/audio.js';
import { ChatSystem } from './shared/chat.js';

import { initRouter, registerRoute, navigate, setNavConnectionState } from './ui/navigation.js';
import { renderGameLibrary } from './ui/game-library.js';
import { renderLobby, setToastFn as setLobbyToastFn } from './ui/lobby.js';
import { initDiagnostics, updateDiagnostics, addError } from './ui/diagnostics.js';

// ================================================================
// Global State
// ================================================================

let localPlayer = null;
let transport = null;
let roomManager = null;
let lifecycle = null;
let chatSystem = null;

const viewContainer = document.getElementById('view-container');

// ================================================================
// Toast Notification System
// ================================================================

const toastQueue = [];
let toastRunning = false;

/**
 * Show a toast notification.
 * @param {string} title
 * @param {string} [message]
 * @param {'success'|'error'|'info'|'warning'} [type]
 * @param {number} [duration] ms
 */
export function showToast(title, message = '', type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss notification">✕</button>
  `;

  const dismiss = () => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  container.appendChild(toast);
  setTimeout(dismiss, duration);
}

// ================================================================
// Modal System
// ================================================================

/**
 * Show a modal dialog.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string|HTMLElement} opts.body
 * @param {Array<{label: string, action: Function, variant?: string}>} [opts.actions]
 * @returns {Function} close function
 */
export function showModal({ title, body, actions = [] }) {
  const container = document.getElementById('modal-container');
  if (!container) return () => {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.pointerEvents = 'all';

  const actionsHtml = actions.map((a, i) =>
    `<button class="btn btn-${a.variant || 'ghost'}" data-action="${i}">${escapeHtml(a.label)}</button>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-title">${escapeHtml(title)}</h2>
        <button class="modal-close-btn" id="modal-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body" id="modal-body">
        ${typeof body === 'string' ? body : ''}
      </div>
      ${actionsHtml ? `<div class="modal-footer">${actionsHtml}</div>` : ''}
    </div>
  `;

  if (body instanceof HTMLElement) {
    overlay.querySelector('#modal-body').appendChild(body);
  }

  const close = () => overlay.remove();

  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  actions.forEach((a, i) => {
    overlay.querySelector(`[data-action="${i}"]`)?.addEventListener('click', () => {
      a.action();
      close();
    });
  });

  container.appendChild(overlay);
  return close;
}

// ================================================================
// Room / Multiplayer Management
// ================================================================

function cleanupRoom() {
  if (chatSystem) { chatSystem.unmountDock(); chatSystem = null; }
  if (lifecycle) { lifecycle.destroy(); lifecycle = null; }
  if (roomManager) { roomManager.destroy(); roomManager = null; }
  if (transport) { transport.disconnect(); transport = null; }
  setNavConnectionState('disconnected');
  updateDiagnosticsPanel();
}

async function createRoom() {
  if (transport) {
    showToast('Already in a room', 'Leave the current room first', 'warning');
    return;
  }

  try {
    setNavConnectionState('connecting');
    transport = new MultiplayerTransport(localPlayer);
    const roomId = await transport.createRoom();

    roomManager = new RoomManager(transport, localPlayer);
    roomManager.initAsHost();

    lifecycle = new GameLifecycle(roomManager, transport, localPlayer);

    // Mount floating emoji reaction dock
    chatSystem = new ChatSystem(transport, localPlayer);
    chatSystem.mountDock(document.body);

    // Default game
    roomManager.selectGame('budget-draft', {});

    setNavConnectionState('connected');
    updateDiagnosticsPanel();

    // Show lobby
    navigate('lobby');

    showToast('Room Created!', `Code: ${roomId}`, 'success');
  } catch (err) {
    console.error('[App] Create room failed:', err);
    cleanupRoom();
    showToast('Connection Failed', err.message || 'Could not create room. Check your connection.', 'error');
    addError(`createRoom: ${err.message}`);
  }
}

async function joinRoom(roomCode) {
  if (!roomCode) {
    showToast('Enter a room code', 'Please enter the 6-character code', 'warning');
    return;
  }

  const code = roomCode.trim().toUpperCase();

  if (transport) {
    showToast('Already in a room', 'Leave the current room first', 'warning');
    return;
  }

  try {
    setNavConnectionState('connecting');
    transport = new MultiplayerTransport(localPlayer);
    await transport.joinRoom(code);

    roomManager = new RoomManager(transport, localPlayer);
    roomManager.initAsClient();

    lifecycle = new GameLifecycle(roomManager, transport, localPlayer);

    // Mount floating emoji reaction dock
    chatSystem = new ChatSystem(transport, localPlayer);
    chatSystem.mountDock(document.body);

    setNavConnectionState('connected');
    updateDiagnosticsPanel();

    navigate('lobby');
    showToast('Joined Room!', `You are now in room ${code}`, 'success');
  } catch (err) {
    console.error('[App] Join room failed:', err);
    cleanupRoom();
    const msg = err.message?.includes('Could not connect') || err.type === 'peer-unavailable'
      ? `Room "${code}" not found. Check the code and try again.`
      : err.message || 'Could not join room.';
    showToast('Could Not Join', msg, 'error');
    addError(`joinRoom: ${err.message}`);
  }
}

function leaveRoom() {
  if (!transport) return;

  showModal({
    title: 'Leave Room',
    body: '<p class="text-secondary">Are you sure you want to leave this room?</p>',
    actions: [
      {
        label: 'Leave',
        variant: 'danger',
        action: () => {
          cleanupRoom();
          navigate('home');
          showToast('Left Room', '', 'info');
        },
      },
      { label: 'Stay', variant: 'ghost', action: () => {} },
    ],
  });
}

// ================================================================
// Game Flow
// ================================================================

function startGame(settings) {
  if (!roomManager || !lifecycle || !roomManager.isHost()) return;
  if (!roomManager.canStart()) {
    showToast('Not ready', 'All players must be ready', 'warning');
    return;
  }

  const snap = roomManager.getSnapshot();
  const gameId = snap.selectedGameId;
  const gameModule = GameRegistry.get(gameId);

  if (!gameModule) {
    showToast('Error', 'Selected game not found', 'error');
    return;
  }

  lifecycle.startGame(gameModule, { ...settings }, snap.players);
}

// ================================================================
// Views
// ================================================================

function renderView(html) {
  viewContainer.innerHTML = html;
}

function renderHomeView() {
  const history = Persistence.loadMatchHistory();
  const recentHtml = history.slice(0, 3).map(record => `
    <div class="match-record">
      <span class="text-sm font-semibold">${escapeHtml(record.gameId || 'Budget Draft')}</span>
      <span class="text-xs text-muted">${new Date(record.playedAt || record.savedAt).toLocaleDateString()}</span>
      ${record.results?.winnerId === localPlayer.id
        ? '<span class="match-result-win">WIN</span>'
        : record.results?.isTie
        ? '<span class="text-muted" style="font-size:0.75rem">TIE</span>'
        : '<span class="match-result-lose">LOSS</span>'
      }
    </div>
  `).join('');

  renderView(`
    <div>
      <!-- Hero Section -->
      <div class="hero-section">
        <div>
          <h1 class="hero-title">
            <span class="gradient-text">Party Hub</span>
          </h1>
          <p class="hero-subtitle" style="margin-top:12px;">Play together, anywhere. No accounts needed.</p>
        </div>

        <div class="hero-actions">
          <button class="btn btn-primary btn-xl" id="create-room-hero">
            🎮 Create Room
          </button>
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <div class="join-room-form">
              <input class="input input-lg join-code-input" id="join-code-input"
                     placeholder="ROOM CODE"
                     maxlength="6"
                     autocomplete="off"
                     spellcheck="false"
                     aria-label="Enter room code" />
              <button class="btn btn-secondary btn-lg" id="join-room-hero">Join →</button>
            </div>
            <span class="text-xs text-muted">Enter a 6-character code to join a friend's room</span>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">${GameRegistry.count()}</span>
            <span class="stat-label">Game${GameRegistry.count() !== 1 ? 's' : ''} Available</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">2</span>
            <span class="stat-label">Players / Room</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">Free</span>
            <span class="stat-label">No Account</span>
          </div>
        </div>
      </div>

      <!-- Featured Games -->
      <div class="view-section">
        <div class="view-section-title">🎲 Games</div>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));">
          ${GameRegistry.getAll().map(game => `
            <div class="card card-interactive card-blue-glow" style="display:flex;flex-direction:column;gap:12px;" role="button" tabindex="0" aria-label="Play ${game.metadata.title}">
              <div style="font-size:2.5rem;text-align:center;">${game.metadata.emoji || '🎮'}</div>
              <div>
                <div class="font-semibold">${escapeHtml(game.metadata.title)}</div>
                <div class="text-sm text-secondary" style="margin-top:4px;">${escapeHtml(game.metadata.description)}</div>
              </div>
              <div class="flex gap-2 flex-wrap">
                ${(game.metadata.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
              <button class="btn btn-primary btn-sm home-play-btn" data-game-id="${game.metadata.id}">
                Play Now
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Recent Activity -->
      ${history.length > 0 ? `
        <div class="view-section">
          <div class="view-section-title">📜 Recent Activity</div>
          <div class="match-history">${recentHtml}</div>
        </div>
      ` : ''}

      <!-- Player Info -->
      <div class="view-section">
        <div class="card" style="display:flex;align-items:center;gap:16px;padding:20px;">
          <div style="width:48px;height:48px;border-radius:50%;background:${localPlayer.color};display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:800;color:white;flex-shrink:0;">
            ${PlayerManager.getAvatarInitials(localPlayer.displayName)}
          </div>
          <div style="flex:1;">
            <div class="font-semibold" id="player-name-display">${escapeHtml(localPlayer.displayName)}</div>
            <div class="text-xs text-muted">Guest player · ${history.length} match${history.length !== 1 ? 'es' : ''} played</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="edit-name-btn">✏️ Edit Name</button>
        </div>
      </div>
    </div>
  `);

  // Wire home buttons
  document.getElementById('create-room-hero')?.addEventListener('click', createRoom);

  document.getElementById('join-room-hero')?.addEventListener('click', () => {
    const code = document.getElementById('join-code-input')?.value;
    joinRoom(code);
  });

  document.getElementById('join-code-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value;
      joinRoom(code);
    }
    // Auto-uppercase
    setTimeout(() => { e.target.value = e.target.value.toUpperCase(); }, 0);
  });

  document.querySelectorAll('.home-play-btn').forEach(btn => {
    btn.addEventListener('click', () => createRoom());
  });

  document.getElementById('edit-name-btn')?.addEventListener('click', () => {
    showModal({
      title: '✏️ Edit Display Name',
      body: `
        <div class="form-group">
          <label class="form-label" for="new-name-input">Display Name</label>
          <input class="input" id="new-name-input" value="${escapeHtml(localPlayer.displayName)}" maxlength="24" placeholder="Your name" />
          <span class="form-hint">Max 24 characters. Visible to other players.</span>
        </div>
      `,
      actions: [
        {
          label: 'Save',
          variant: 'primary',
          action: () => {
            const newName = document.getElementById('new-name-input')?.value?.trim();
            if (newName && newName.length > 0) {
              try {
                localPlayer = PlayerManager.updateDisplayName(newName);
                // Re-render home
                navigate('home');
                showToast('Name Updated', `Now playing as ${newName}`, 'success');
              } catch (err) {
                showToast('Error', err.message, 'error');
              }
            }
          },
        },
        { label: 'Cancel', variant: 'ghost', action: () => {} },
      ],
    });
    setTimeout(() => document.getElementById('new-name-input')?.select(), 100);
  });
}

function renderLobbyView() {
  if (!roomManager) {
    navigate('home');
    return;
  }

  const snap = roomManager.getSnapshot();
  renderView('');

  renderLobby(viewContainer, {
    roomState: snap,
    localPlayerId: localPlayer.id,
    isHost: roomManager.isHost(),
    onReady: (isReady) => {
      if (roomManager.isHost()) {
        roomManager.setReady(localPlayer.id, isReady);
        roomManager.broadcastSnapshot();
      } else {
        roomManager.signalReady(isReady);
      }
    },
    onStartGame: (settings) => {
      startGame(settings);
    },
    onLeave: leaveRoom,
    onGameSelect: (gameId, settings) => {
      if (roomManager.isHost()) {
        roomManager.selectGame(gameId, settings);
      }
    },
    onKick: (playerId) => {
      roomManager.kickPlayer(playerId);
    },
  });
}

function renderGameView() {
  if (!lifecycle || !roomManager) {
    navigate('home');
    return;
  }

  const state = lifecycle.getCurrentState();
  const snap = roomManager.getSnapshot();
  const gameId = snap?.selectedGameId;
  const gameModule = gameId ? GameRegistry.get(gameId) : null;

  if (!gameModule || !state) {
    renderView(`
      <div class="loading-screen">
        <div class="spinner"></div>
        <p class="text-secondary">Waiting for game to start…</p>
      </div>
    `);
    return;
  }

  renderView('');

  const renderCurrentGameState = () => {
    const currentState = lifecycle.getCurrentState();
    if (!currentState) return;

    // Choose render method based on game state phase
    if (currentState.phase === 'reveal') {
      gameModule.renderReveal?.(viewContainer, {
        state: currentState,
        players: snap.players,
        localPlayerId: localPlayer.id,
        onRevealComplete: () => {
          if (roomManager.isHost()) {
            const results = gameModule.calculateResults(currentState);
            lifecycle.finishGame({ ...currentState, phase: 'scoring' });
          }
        },
      });
    } else {
      gameModule.renderGame(viewContainer, {
        state: currentState,
        localPlayerId: localPlayer.id,
        players: snap.players,
        isHost: roomManager.isHost(),
        onAction: (actionPayload) => {
          lifecycle.submitAction(actionPayload);
        },
      });
    }
  };

  renderCurrentGameState();

  // Listen for state updates to re-render
  const onStateUpdated = () => renderCurrentGameState();
  EventBus.on('game:state-updated', onStateUpdated);

  // Clean up listener when navigating away
  const cleanup = () => EventBus.off('game:state-updated', onStateUpdated);
  EventBus.once('nav:route-changed', cleanup);
}

function renderResultsView() {
  if (!lifecycle || !roomManager) {
    navigate('home');
    return;
  }

  const state = lifecycle.getCurrentState();
  const snap = roomManager.getSnapshot();
  const gameId = snap?.selectedGameId;
  const gameModule = gameId ? GameRegistry.get(gameId) : null;

  if (!gameModule || !state) {
    navigate('home');
    return;
  }

  renderView('');

  const results = state.results || gameModule.calculateResults(state);

  gameModule.renderResults(viewContainer, {
    state,
    results,
    localPlayerId: localPlayer.id,
    players: snap.players,
    onRematch: () => {
      if (roomManager.isHost()) {
        lifecycle.resetForRematch();
        navigate('lobby');
      } else {
        lifecycle.requestRematch();
        showToast('Rematch Requested', 'Waiting for host…', 'info');
      }
    },
    onLeave: leaveRoom,
  });
}

function renderProfileView() {
  const history = Persistence.loadMatchHistory();
  const wins = history.filter(r => r.results?.winnerId === localPlayer.id).length;
  const losses = history.filter(r => r.results?.winnerId && r.results.winnerId !== localPlayer.id).length;
  const ties = history.filter(r => r.results?.isTie).length;

  renderView(`
    <div style="max-width:700px;margin:0 auto;">
      <h1 style="font-size:1.5rem;font-weight:800;margin-bottom:var(--space-6);">👤 Profile</h1>

      <!-- Profile Card -->
      <div class="profile-header">
        <div class="profile-avatar-lg" style="background:${localPlayer.color}">
          ${PlayerManager.getAvatarInitials(localPlayer.displayName)}
        </div>
        <div class="profile-info">
          <div class="profile-name">${escapeHtml(localPlayer.displayName)}</div>
          <div class="profile-id">${localPlayer.id.slice(0, 16)}…</div>
          <div class="profile-stats">
            <div class="profile-stat">
              <span class="profile-stat-value" style="color:var(--accent-green)">${wins}</span>
              <span class="profile-stat-label">Wins</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat-value" style="color:var(--accent-red)">${losses}</span>
              <span class="profile-stat-label">Losses</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat-value" style="color:var(--text-muted)">${ties}</span>
              <span class="profile-stat-label">Ties</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat-value">${history.length}</span>
              <span class="profile-stat-label">Total</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Match History -->
      <div class="view-section-title" style="margin-bottom:12px;">📜 Match History</div>
      ${history.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🎲</div>
          <h3>No matches yet</h3>
          <p>Play your first game to see your history here</p>
          <a href="#home" class="btn btn-primary">Play Now</a>
        </div>
      ` : `
        <div class="match-history">
          ${history.map(r => `
            <div class="match-record">
              <span class="badge badge-blue">${escapeHtml(r.gameId || 'Game')}</span>
              <span class="text-sm flex-1">vs ${escapeHtml(r.players?.find(p => p.id !== localPlayer.id)?.displayName || 'Unknown')}</span>
              <span class="text-xs text-muted">${new Date(r.playedAt || r.savedAt).toLocaleDateString()}</span>
              ${r.results?.winnerId === localPlayer.id
                ? '<span class="match-result-win">WIN</span>'
                : r.results?.isTie
                ? '<span style="font-size:0.75rem;color:var(--text-muted)">TIE</span>'
                : '<span class="match-result-lose">LOSS</span>'
              }
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `);
}

// ================================================================
// Event Listeners
// ================================================================

function wireGlobalEvents() {
  // Nav create button
  document.getElementById('nav-create-btn')?.addEventListener('click', createRoom);

  // Nav sound toggle
  const soundBtn = document.getElementById('nav-sound-btn');
  if (soundBtn) {
    soundBtn.textContent = Sound.isMuted() ? '🔇' : '🔊';
    soundBtn.addEventListener('click', () => {
      const isMuted = Sound.toggleMute();
      soundBtn.textContent = isMuted ? '🔇' : '🔊';
      showToast(isMuted ? 'Audio Muted' : 'Audio Enabled', '', 'info', 1500);
    });
  }

  // Room state changes → re-render lobby
  EventBus.on('room:state-changed', (state) => {
    if (!state) return;
    updateDiagnosticsPanel();
    const currentRoute = window.location.hash.slice(1);
    if (currentRoute === 'lobby') {
      renderLobbyView();
    }
  });

  // Game started → navigate to play view
  EventBus.on('game:started', () => {
    navigate('play');
  });

  // Game finished → navigate to results
  EventBus.on('game:finished', () => {
    navigate('results');
  });

  // Game reset (rematch) → navigate to lobby
  EventBus.on('game:reset', () => {
    navigate('lobby');
  });

  // Kicked from room
  EventBus.on('room:kicked', () => {
    cleanupRoom();
    navigate('home');
    showToast('Removed from room', 'You were removed by the host', 'warning');
  });

  // Multiplayer errors
  EventBus.on('multiplayer:error', ({ error }) => {
    const msg = error?.message || String(error);
    showToast('Connection Error', msg, 'error');
    addError(msg);
  });

  // Peer left
  EventBus.on('multiplayer:peer-left', () => {
    if (roomManager) {
      showToast('Player disconnected', 'Your opponent has disconnected', 'warning');
    }
  });

  // Handle join from URL hash (e.g., #join/ABCD12)
  EventBus.on('nav:route-changed', ({ route }) => {
    const joinMatch = route.match(/^join\/([A-Z0-9]{6})$/i);
    if (joinMatch) {
      joinRoom(joinMatch[1]);
    }
  });
}

function updateDiagnosticsPanel() {
  updateDiagnostics({ localPlayer, transport, roomManager, lifecycle });
}

// ================================================================
// Router Setup
// ================================================================

function setupRoutes() {
  registerRoute('home', () => renderHomeView());
  registerRoute('library', () => renderGameLibrary(viewContainer));
  registerRoute('lobby', () => renderLobbyView());
  registerRoute('play', () => renderGameView());
  registerRoute('results', () => renderResultsView());
  registerRoute('profile', () => renderProfileView());
  registerRoute(/^join\/(.+)$/, ([code]) => {
    joinRoom(code);
  });
}

// ================================================================
// Bootstrap
// ================================================================

async function bootstrap() {
  try {
    console.log('[App] Party Hub bootstrapping…');

    // 1. Check persistence
    if (!Persistence.isAvailable()) {
      console.warn('[App] localStorage not available. Progress will not be saved.');
    }

    // 2. Load or create local player identity
    localPlayer = PlayerManager.getLocalPlayer();
    console.log('[App] Local player:', localPlayer.displayName, localPlayer.id.slice(0, 8));

    // 3. Register game modules (All 6 YouTube / Internet games)
    GameRegistry.register(BudgetDraftModule);
    GameRegistry.register(FiveVsFiveModule);
    GameRegistry.register(PopularityBattleModule);
    GameRegistry.register(BlindRankingModule);
    GameRegistry.register(SurvivalInventoryModule);
    GameRegistry.register(CounterPickModule);
    console.log('[App] Games registered:', GameRegistry.count());

    // 4. Init diagnostics
    initDiagnostics();
    updateDiagnosticsPanel();

    // 5. Inject toast into lobby (avoids circular import)
    setLobbyToastFn(showToast);

    // 5. Wire global events
    wireGlobalEvents();

    // 6. Setup router
    setupRoutes();

    // 7. Init router (triggers initial route dispatch)
    initRouter();

    console.log('[App] Party Hub ready ✓');
  } catch (err) {
    console.error('[App] Bootstrap failed:', err);
    viewContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Party Hub failed to load</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Reload</button>
      </div>
    `;
  }
}

// ================================================================
// Utilities
// ================================================================

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ================================================================
// Start
// ================================================================

bootstrap();
