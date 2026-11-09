/**
 * lobby.js — Lobby/room view
 * Party Hub UI module
 *
 * Shows room code, player slots, game settings, ready/start controls.
 */

import { EventBus } from '../core/event-bus.js';
import { GameRegistry } from '../core/game-registry.js';
import { getAvatarInitials } from '../core/player-manager.js';

/** Toast function injected to avoid circular import with app.js */
let _showToast = (title, msg, type) => console.log(`[Toast] ${type}: ${title} ${msg}`);

/** Call this once from app.js to inject the toast function */
export function setToastFn(fn) { _showToast = fn; }

function showToast(title, msg, type) { _showToast(title, msg, type); }

let _currentLobbySettings = {};

/**
 * Render the lobby view.
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {object} opts.roomState - Current room state
 * @param {string} opts.localPlayerId
 * @param {boolean} opts.isHost
 * @param {Function} opts.onReady - (isReady: boolean) => void
 * @param {Function} opts.onStartGame - (settings: object) => void
 * @param {Function} opts.onLeave - () => void
 * @param {Function} opts.onGameSelect - (gameId: string, settings: object) => void
 * @param {Function} opts.onKick - (playerId: string) => void
 */
export function renderLobby(container, opts) {
  const { roomState, localPlayerId, isHost, onReady, onStartGame, onLeave, onGameSelect, onKick } = opts;
  if (!roomState) {
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading lobby…</p></div>';
    return;
  }

  const { roomId, players, selectedGameId, phase } = roomState;
  const selectedGame = selectedGameId ? GameRegistry.get(selectedGameId) : null;
  const localPlayer = players.find(p => p.id === localPlayerId);
  const isLocalReady = localPlayer?.isReady ?? false;
  const allReady = players.every(p => p.isReady) && players.length >= 2;
  const canStart = isHost && allReady && !!selectedGameId;

  // Build the share URL
  const shareUrl = `${window.location.origin}${window.location.pathname}#join/${roomId}`;

  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto;">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 style="font-size:1.5rem;font-weight:800;margin-bottom:4px;">
            ${isHost ? '👑 ' : ''}Party Room
          </h1>
          <p class="text-secondary text-sm">Share the code below to invite a friend</p>
        </div>
        <button class="btn btn-ghost" id="leave-btn">← Leave Room</button>
      </div>

      <div class="lobby-container">
        <!-- Left column: room info + players -->
        <div class="flex flex-col gap-5">

          <!-- Room Code -->
          <div class="lobby-room-info">
            <div class="text-sm font-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.08em;">Room Code</div>
            <div class="room-code">
              <span class="room-code-text" id="room-code-display">${roomId}</span>
              <button class="room-code-copy-btn" id="copy-code-btn" aria-label="Copy room code">📋 Copy</button>
            </div>
            <button class="btn btn-ghost btn-sm" id="share-link-btn">🔗 Copy Invite Link</button>
            <div class="text-xs text-muted" style="max-width:300px;text-align:center;">
              Tell your friend to open Party Hub and enter this code
            </div>
          </div>

          <!-- Players -->
          <div class="lobby-players-section">
            <div class="lobby-section-title">Players (${players.length}/4)</div>
            <div id="player-slots" class="flex flex-col gap-2">
              ${renderPlayerSlots(players, localPlayerId, isHost, onKick)}
            </div>
            ${players.length < 2 ? `
              <div style="padding:12px;background:rgba(88,166,255,0.06);border:1px dashed rgba(88,166,255,0.25);border-radius:12px;text-align:center;">
                <p class="text-sm text-secondary">⏳ Waiting for a friend to join…</p>
              </div>
            ` : ''}
          </div>

          <!-- Ready + Start buttons -->
          <div class="flex flex-col gap-3">
            <!-- All players including host get a Ready button -->
            <button class="btn ${isLocalReady ? 'btn-ghost' : 'btn-success'} btn-block" id="ready-btn">
              ${isLocalReady ? '✅ Ready! (Click to cancel)' : '🟢 Mark as Ready'}
            </button>

            ${isHost ? `
              <button class="btn btn-primary btn-block btn-lg" id="start-btn" ${!canStart ? 'disabled' : ''}>
                🚀 Start Game
              </button>
              ${!canStart ? `
                <p class="text-xs text-center text-muted">
                  ${!selectedGameId ? 'Select a game first' : players.length < 2 ? 'Need at least 2 players' : !allReady ? 'All players must be ready' : ''}
                </p>
              ` : ''}
            ` : ''}
          </div>
        </div>

        <!-- Right column: game settings -->
        <div class="flex flex-col gap-4">
          <!-- Game selector -->
          <div class="card" style="padding: var(--space-5);">
            <div class="flex justify-between items-center mb-3">
              <div class="lobby-section-title" style="margin-bottom:0">Selected Game</div>
              ${isHost && selectedGame ? '<button class="btn btn-ghost btn-sm" id="change-game-btn">🔄 Switch Game</button>' : ''}
            </div>
            <div id="game-picker-container" class="${selectedGame ? 'hidden' : ''}">
              ${renderNoGameSelected(isHost)}
            </div>
            <div id="game-preview-container" class="${!selectedGame ? 'hidden' : ''}">
              ${selectedGame ? renderGamePreview(selectedGame) : ''}
            </div>
          </div>

          <!-- Game settings panel -->
          ${selectedGame ? `
            <div class="card" style="padding: var(--space-5);">
              <div class="lobby-section-title">Game Settings</div>
              <div id="game-settings-container"></div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Wire buttons
  container.querySelector('#leave-btn')?.addEventListener('click', onLeave);

  container.querySelector('#copy-code-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(roomId).then(() => {
      showToast('Copied!', `Room code ${roomId} copied to clipboard`, 'success');
    }).catch(() => {
      showToast('Code', roomId, 'info');
    });
  });

  container.querySelector('#share-link-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Link Copied!', 'Share this with your friend', 'success');
    }).catch(() => {
      showToast('Invite Link', shareUrl, 'info');
    });
  });

  container.querySelector('#ready-btn')?.addEventListener('click', () => {
    onReady?.(!isLocalReady);
  });

  container.querySelector('#start-btn')?.addEventListener('click', () => {
    if (canStart) {
      onStartGame?.(_currentLobbySettings);
    }
  });

  // Game switch button
  container.querySelector('#change-game-btn')?.addEventListener('click', () => {
    const picker = container.querySelector('#game-picker-container');
    const preview = container.querySelector('#game-preview-container');
    if (picker && preview) {
      picker.classList.toggle('hidden');
      preview.classList.toggle('hidden');
    }
  });

  // Game picker buttons
  container.querySelectorAll('.select-game-btn')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const gameId = btn.dataset.gameId;
      _currentLobbySettings = {};
      onGameSelect?.(gameId, _currentLobbySettings);
    });
  });

  // Render game settings if game is selected
  if (selectedGame) {
    const settingsContainer = container.querySelector('#game-settings-container');
    if (settingsContainer) {
      _currentLobbySettings = { ...roomState.gameSettings };
      selectedGame.renderLobby?.(settingsContainer, {
        settings: _currentLobbySettings,
        isHost,
        onSettingsChange: (newSettings) => {
          _currentLobbySettings = newSettings;
          onGameSelect?.(selectedGameId, newSettings);
        },
      });
    }
  }
}

function renderPlayerSlots(players, localPlayerId, isHost, onKick) {
  const slots = [...players];
  // Pad to show empty slots (up to 4)
  while (slots.length < Math.min(4, 2)) {
    slots.push(null);
  }

  return slots.map(player => {
    if (!player) {
      return `
        <div class="player-slot empty" aria-label="Empty slot">
          <div class="player-avatar" style="background:var(--bg-tertiary);color:var(--text-muted)">?</div>
          <span class="text-muted text-sm">Waiting for player…</span>
        </div>
      `;
    }

    const isMe = player.id === localPlayerId;
    const initials = getAvatarInitials(player.displayName);
    const connClass = player.isConnected ? 'dot-connected' : 'dot-disconnected';

    return `
      <div class="player-slot${player.isHost ? ' is-host' : ''}${player.isReady ? ' is-ready' : ''}">
        <div class="player-slot-left">
          <div class="player-avatar" style="background:${player.color}">
            ${initials}
          </div>
          <div class="player-info">
            <div class="player-name">
              ${player.isHost ? '<span class="crown-icon" title="Host">👑</span> ' : ''}
              ${escapeHtml(player.displayName)}
              ${isMe ? ' <span class="text-muted text-sm">(You)</span>' : ''}
            </div>
            <div class="player-badges">
              <div class="connection-dot ${connClass}" title="${player.isConnected ? 'Connected' : 'Disconnected'}"></div>
              <span class="text-xs text-muted">${player.isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        <div class="player-slot-right">
          <span class="ready-indicator ${player.isReady ? 'ready' : 'not-ready'}">
            ${player.isReady ? '✓ Ready' : 'Not Ready'}
          </span>
          ${isHost && !isMe ? `
            <button class="btn btn-ghost btn-sm kick-btn" data-player-id="${player.id}" title="Kick player" aria-label="Kick ${player.displayName}">
              ✕
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderGamePreview(game) {
  const { title, subtitle, description, minPlayers, maxPlayers, estimatedDuration, emoji } = game.metadata;
  return `
    <div class="game-preview-header">
      <div class="game-preview-icon">${emoji || '🎮'}</div>
      <div>
        <div class="font-semibold">${escapeHtml(title)}</div>
        <div class="text-sm text-muted">${escapeHtml(subtitle || '')}</div>
      </div>
    </div>
    <p class="text-sm text-secondary" style="margin-top:8px;">${escapeHtml(description)}</p>
    <div class="flex gap-4 mt-3">
      <span class="text-xs text-muted">👥 ${minPlayers}–${maxPlayers} players</span>
      <span class="text-xs text-muted">⏱ ${estimatedDuration}</span>
    </div>
  `;
}

function renderNoGameSelected(isHost) {
  const games = GameRegistry.getAll();
  if (!isHost) {
    return '<p class="text-sm text-muted text-center">The host will select a game</p>';
  }
  return `
    <p class="text-sm text-secondary mb-3">Choose a game to play:</p>
    <div class="flex flex-col gap-2">
      ${games.map(g => `
        <button class="btn btn-ghost select-game-btn" data-game-id="${g.metadata.id}" style="justify-content:flex-start;gap:12px;">
          <span>${g.metadata.emoji || '🎮'}</span>
          <div style="text-align:left;">
            <div class="font-semibold text-sm">${escapeHtml(g.metadata.title)}</div>
            <div class="text-xs text-muted">${escapeHtml(g.metadata.subtitle || g.metadata.category)}</div>
          </div>
        </button>
      `).join('')}
    </div>
  `;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
