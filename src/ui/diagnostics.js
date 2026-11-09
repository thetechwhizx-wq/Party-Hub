/**
 * diagnostics.js — Developer diagnostics panel
 * Party Hub UI module
 *
 * Toggle with Ctrl+Shift+D
 * Shows room, match, peer, state info and recent errors.
 */

import { EventBus } from '../core/event-bus.js';

const MAX_ERRORS = 10;
const _errors = [];

/**
 * Initialise the diagnostics panel.
 * Binds the keyboard toggle and subscribes to events.
 */
export function initDiagnostics() {
  // Toggle on Ctrl+Shift+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      toggleDiagnostics();
    }
  });

  // Close button
  document.getElementById('diag-close-btn')?.addEventListener('click', () => {
    hideDiagnostics();
  });

  // Listen to events to update panel
  EventBus.on('multiplayer:message', ({ message }) => {
    setDiagField('diag-last-msg', `${message.type} @ ${new Date().toISOString().slice(11, 19)}`);
    setDiagField('diag-sync', new Date().toISOString().slice(11, 19));
  });

  EventBus.on('multiplayer:error', ({ error }) => {
    addError(error?.message || String(error));
  });

  EventBus.on('multiplayer:connected', ({ roomId }) => {
    setDiagField('diag-peer-state', 'connected');
  });

  EventBus.on('multiplayer:disconnected', () => {
    setDiagField('diag-peer-state', 'disconnected');
  });

  EventBus.on('room:state-changed', (state) => {
    if (!state) return;
    setDiagField('diag-room-id', state.roomId || '—');
    setDiagField('diag-phase', state.phase || '—');
  });

  EventBus.on('game:started', ({ matchId, gameId }) => {
    setDiagField('diag-match-id', matchId || '—');
    setDiagField('diag-game', gameId || '—');
    setDiagField('diag-phase', 'playing');
    setDiagField('diag-version', '0');
  });

  EventBus.on('game:state-updated', ({ state }) => {
    setDiagField('diag-version', String(state?.version ?? '—'));
    setDiagField('diag-phase', state?.phase || '—');
    setDiagField('diag-sync', new Date().toISOString().slice(11, 19));
  });

  EventBus.on('game:finished', () => {
    setDiagField('diag-phase', 'finished');
  });

  // Global error handler
  window.addEventListener('error', (e) => {
    addError(`JS Error: ${e.message}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    addError(`Unhandled Promise: ${e.reason?.message || e.reason}`);
  });
}

/**
 * Update diagnostics with current player/transport info.
 * @param {{ localPlayer: object, transport: object, roomManager: object, lifecycle: object }} context
 */
export function updateDiagnostics(context) {
  const { localPlayer, transport, roomManager, lifecycle } = context;

  if (localPlayer) {
    setDiagField('diag-player-id', localPlayer.id?.slice(0, 12) + '…');
  }

  if (transport) {
    setDiagField('diag-peer-state', transport.getState());
    setDiagField('diag-role', transport.isHost() ? 'HOST' : 'CLIENT');
  }

  if (roomManager) {
    const snap = roomManager.getSnapshot();
    if (snap) {
      setDiagField('diag-room-id', snap.roomId);
      setDiagField('diag-phase', snap.phase);
    }
  }

  if (lifecycle) {
    setDiagField('diag-match-id', lifecycle.getMatchId() || '—');
    setDiagField('diag-version', String(lifecycle.getStateVersion()));
    setDiagField('diag-phase', lifecycle.getCurrentPhase());
  }
}

export function toggleDiagnostics() {
  const panel = document.getElementById('diagnostics-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
}

export function hideDiagnostics() {
  document.getElementById('diagnostics-panel')?.classList.add('hidden');
}

export function showDiagnostics() {
  document.getElementById('diagnostics-panel')?.classList.remove('hidden');
}

function setDiagField(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function addError(message) {
  const ts = new Date().toISOString().slice(11, 19);
  _errors.unshift(`[${ts}] ${message}`);
  if (_errors.length > MAX_ERRORS) _errors.pop();
  renderErrors();
}

function renderErrors() {
  const container = document.getElementById('diag-errors');
  if (!container) return;
  container.innerHTML = _errors
    .map(e => `<div class="diag-error-entry">${escapeHtml(e)}</div>`)
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
