/**
 * game-lifecycle.js — Lifecycle orchestrator for all games
 * Party Hub core module
 *
 * Host is authoritative: validates actions, applies state, broadcasts.
 * Clients send PLAYER_ACTION, receive STATE_UPDATE / STATE_SNAPSHOT.
 */

import { EventBus } from './event-bus.js';
import { MSG, buildMessage } from './multiplayer.js';
import { Persistence } from './persistence.js';

export class GameLifecycle {
  /**
   * @param {import('./room-manager.js').RoomManager} roomManager
   * @param {import('./multiplayer.js').MultiplayerTransport} transport
   * @param {{ id: string, displayName: string, color: string }} localPlayer
   */
  constructor(roomManager, transport, localPlayer) {
    this._roomManager = roomManager;
    this._transport = transport;
    this._localPlayer = localPlayer;
    this._gameModule = null;
    this._state = null;
    this._matchId = null;
    this._phase = 'idle'; // idle | playing | finished
    this._stateVersion = 0;
    this._processedActionIds = new Set();

    this._onMessage = this._onMessage.bind(this);
    EventBus.on('room:game-message', this._onMessage);
  }

  // ----------------------------------------------------------------
  // Start / Finish
  // ----------------------------------------------------------------

  /**
   * Host: start a game.
   * @param {object} gameModule
   * @param {object} config
   * @param {object[]} players
   */
  startGame(gameModule, config, players) {
    if (!this._roomManager.isHost()) return;

    this._gameModule = gameModule;
    this._matchId = crypto.randomUUID();
    this._stateVersion = 0;
    this._processedActionIds.clear();
    this._phase = 'playing';

    // Create initial state
    const initialState = gameModule.createInitialState(config, players);
    this._state = { ...initialState, version: 0 };

    console.log('[GameLifecycle] Starting game:', gameModule.metadata.id, 'match:', this._matchId);

    const roomSnapshot = this._roomManager.getSnapshot();
    if (roomSnapshot) {
      this._roomManager.setPhase('playing');
    }

    // Broadcast GAME_START with initial state
    this._transport.send(buildMessage(
      MSG.GAME_START,
      this._transport.getRoomId(),
      this._localPlayer.id,
      {
        matchId: this._matchId,
        gameId: gameModule.metadata.id,
        config,
        players,
        initialState: this._state,
      }
    ));

    EventBus.emit('game:started', {
      matchId: this._matchId,
      gameId: gameModule.metadata.id,
      state: this._state,
    });
  }

  /**
   * Submit a player action (client or host).
   * Host applies immediately; client sends to host.
   * @param {object} actionPayload - Game-specific action
   */
  submitAction(actionPayload) {
    if (!this._gameModule || this._phase !== 'playing') return;

    const actionId = crypto.randomUUID();
    const roomId = this._transport.getRoomId();

    if (this._roomManager.isHost()) {
      // Host applies locally
      this._applyActionAsHost(actionId, actionPayload, this._localPlayer.id);
    } else {
      // Client sends to host
      this._transport.send(buildMessage(
        MSG.PLAYER_ACTION,
        roomId,
        this._localPlayer.id,
        {
          matchId: this._matchId,
          actionId,
          expectedVersion: this._stateVersion,
          action: actionPayload,
        }
      ));
    }
  }

  /**
   * Host: apply an action and broadcast.
   */
  _applyActionAsHost(actionId, actionPayload, playerId) {
    if (!this._gameModule || !this._state) return;

    // Deduplicate
    if (this._processedActionIds.has(actionId)) {
      console.warn('[GameLifecycle] Duplicate action ignored:', actionId);
      return;
    }

    // Validate
    const validation = this._gameModule.validateAction(this._state, actionPayload, playerId);
    if (!validation.valid) {
      console.warn('[GameLifecycle] Invalid action from', playerId, ':', validation.reason);
      // Optionally send error back to the client
      EventBus.emit('game:action-rejected', { playerId, reason: validation.reason, actionId });
      return;
    }

    // Apply (immutable)
    const newState = this._gameModule.applyAction(this._state, actionPayload, playerId);
    this._stateVersion++;
    this._state = { ...newState, version: this._stateVersion };
    this._processedActionIds.add(actionId);

    // Check if game is complete
    if (this._gameModule.isComplete(this._state)) {
      this.finishGame(this._state);
      return;
    }

    // Broadcast state update
    this.broadcastStateUpdate(this._state);
    EventBus.emit('game:state-updated', { state: this._state, actionId });
  }

  /**
   * Host: finish game and broadcast results.
   */
  finishGame(state) {
    if (!this._gameModule) return;
    this._phase = 'finished';

    const results = this._gameModule.calculateResults(state);
    this._state = { ...state, results, phase: 'finished' };

    // Save match record (host saves)
    if (this._roomManager.isHost()) {
      const roomSnapshot = this._roomManager.getSnapshot();
      const record = {
        matchId: this._matchId,
        gameId: this._gameModule.metadata.id,
        gameVersion: '1.0',
        playedAt: Date.now(),
        players: (roomSnapshot?.players || []).map(p => ({
          id: p.id,
          displayName: p.displayName,
        })),
        config: state.config,
        results,
      };
      Persistence.saveMatchRecord(record);
    }

    // Broadcast
    this._transport.send(buildMessage(
      MSG.MATCH_FINISHED,
      this._transport.getRoomId(),
      this._localPlayer.id,
      {
        matchId: this._matchId,
        finalState: this._state,
        results,
      }
    ));

    this._roomManager.setPhase('results');
    EventBus.emit('game:finished', { state: this._state, results });
  }

  /**
   * Reset for rematch (host).
   */
  resetForRematch() {
    this._state = null;
    this._matchId = null;
    this._stateVersion = 0;
    this._phase = 'idle';
    this._processedActionIds.clear();
    this._roomManager.setPhase('lobby');
    // Reset all player ready states
    const snapshot = this._roomManager.getSnapshot();
    if (snapshot) {
      snapshot.players.forEach(p => this._roomManager.setReady(p.id, false));
      this._roomManager.broadcastSnapshot();
    }
    EventBus.emit('game:reset', {});
  }

  // ----------------------------------------------------------------
  // Incoming message handling
  // ----------------------------------------------------------------

  _onMessage({ message }) {
    switch (message.type) {
      case MSG.GAME_START:
        if (!this._roomManager.isHost()) {
          this._handleGameStart(message);
        }
        break;

      case MSG.PLAYER_ACTION:
        if (this._roomManager.isHost()) {
          this._handlePlayerAction(message);
        }
        break;

      case MSG.STATE_UPDATE:
      case MSG.STATE_SNAPSHOT:
        if (!this._roomManager.isHost()) {
          this._handleStateUpdate(message);
        }
        break;

      case MSG.MATCH_FINISHED:
        if (!this._roomManager.isHost()) {
          this._handleMatchFinished(message);
        }
        break;

      case MSG.REMATCH_REQUEST:
        EventBus.emit('game:rematch-requested', { playerId: message.playerId });
        break;

      case MSG.REMATCH_ACCEPT:
        if (this._roomManager.isHost()) {
          this.resetForRematch();
        }
        break;
    }
  }

  _handleGameStart(message) {
    const { matchId, gameId, initialState } = message.payload;
    this._matchId = matchId;
    this._stateVersion = initialState.version || 0;
    this._state = initialState;
    this._phase = 'playing';
    console.log('[GameLifecycle] Client: game started, match:', matchId);
    EventBus.emit('game:started', {
      matchId,
      gameId,
      state: this._state,
    });
  }

  _handlePlayerAction(message) {
    if (!this._roomManager.isHost()) return;
    const { actionId, action } = message.payload;
    this._applyActionAsHost(actionId, action, message.playerId);
  }

  _handleStateUpdate(message) {
    const { state } = message.payload;
    if (!state) return;
    // Accept if version is newer
    if (state.version > this._stateVersion) {
      this._stateVersion = state.version;
      this._state = state;
      EventBus.emit('game:state-updated', { state: this._state });
    } else {
      console.warn('[GameLifecycle] Received stale state update, ignoring');
    }
  }

  _handleMatchFinished(message) {
    const { finalState, results } = message.payload;
    this._state = finalState;
    this._phase = 'finished';
    console.log('[GameLifecycle] Client: match finished');
    EventBus.emit('game:finished', { state: finalState, results });
  }

  // ----------------------------------------------------------------
  // Broadcast
  // ----------------------------------------------------------------

  broadcastStateUpdate(state) {
    if (!this._roomManager.isHost()) return;
    this._transport.send(buildMessage(
      MSG.STATE_UPDATE,
      this._transport.getRoomId(),
      this._localPlayer.id,
      {
        matchId: this._matchId,
        state,
      }
    ));
  }

  requestRematch() {
    this._transport.send(buildMessage(
      MSG.REMATCH_REQUEST,
      this._transport.getRoomId(),
      this._localPlayer.id,
      { matchId: this._matchId }
    ));
  }

  acceptRematch() {
    this._transport.send(buildMessage(
      MSG.REMATCH_ACCEPT,
      this._transport.getRoomId(),
      this._localPlayer.id,
      { matchId: this._matchId }
    ));
    if (this._roomManager.isHost()) {
      this.resetForRematch();
    }
  }

  // ----------------------------------------------------------------
  // Getters
  // ----------------------------------------------------------------

  getCurrentState() { return this._state; }
  getCurrentPhase() { return this._phase; }
  getStateVersion() { return this._stateVersion; }
  getMatchId() { return this._matchId; }

  destroy() {
    EventBus.off('room:game-message', this._onMessage);
  }
}
