/**
 * room-manager.js — Host-authoritative room state
 * Party Hub core module
 */

import { EventBus } from './event-bus.js';
import { MSG, buildMessage } from './multiplayer.js';
import { PlayerManager } from './player-manager.js';

/**
 * @typedef {object} RoomPlayer
 * @property {string} id
 * @property {string} displayName
 * @property {string} color
 * @property {boolean} isReady
 * @property {boolean} isConnected
 * @property {boolean} isHost
 */

/**
 * @typedef {object} RoomState
 * @property {string} roomId
 * @property {string} hostPlayerId
 * @property {RoomPlayer[]} players
 * @property {string|null} selectedGameId
 * @property {object} gameSettings
 * @property {'lobby'|'playing'|'results'} phase
 * @property {number} createdAt
 */

export class RoomManager {
  /**
   * @param {import('./multiplayer.js').MultiplayerTransport} transport
   * @param {{ id: string, displayName: string, color: string }} localPlayer
   */
  constructor(transport, localPlayer) {
    this._transport = transport;
    this._localPlayer = localPlayer;
    this._state = null;
    this._isHost = false;

    // Listen for multiplayer messages
    this._onMessage = this._onMessage.bind(this);
    EventBus.on('multiplayer:message', this._onMessage);
    EventBus.on('multiplayer:peer-joined', ({ peerId }) => {
      // Host: when a new peer connects, send them the current room snapshot
      if (this._isHost && this._state) {
        setTimeout(() => {
          this._transport.sendTo(peerId, buildMessage(
            MSG.ROOM_SNAPSHOT,
            this._state.roomId,
            this._localPlayer.id,
            { snapshot: this._state }
          ));
        }, 300);
      }
    });

    EventBus.on('multiplayer:peer-left', ({ peerId }) => {
      if (this._isHost && this._state) {
        // Find the player whose peer disconnected
        // We stored peerId in the player record when they said HELLO
        const player = this._state.players.find(p => p.peerId === peerId);
        if (player) {
          this.setPlayerConnected(player.id, false);
          this.broadcastSnapshot();
        }
      }
    });
  }

  // ----------------------------------------------------------------
  // Init
  // ----------------------------------------------------------------

  /**
   * Host only: initialise room state.
   */
  initAsHost() {
    this._isHost = true;
    this._state = {
      roomId: this._transport.getRoomId(),
      hostPlayerId: this._localPlayer.id,
      players: [
        {
          id: this._localPlayer.id,
          displayName: this._localPlayer.displayName,
          color: this._localPlayer.color,
          peerId: this._transport.getLocalPeerId(),
          isReady: false,
          isConnected: true,
          isHost: true,
        },
      ],
      selectedGameId: null,
      gameSettings: {},
      phase: 'lobby',
      createdAt: Date.now(),
    };
    console.log('[RoomManager] Initialised as host:', this._state.roomId);
    EventBus.emit('room:state-changed', this._state);
  }

  /**
   * Client only: initialise as client, send HELLO to host.
   */
  initAsClient() {
    this._isHost = false;
    // Send HELLO with small retry loop in case initial packet is dropped during ICE setup
    let attempts = 0;
    const sendHello = () => {
      if (this._state) return; // Snapshot received!
      if (attempts >= 4) return;
      attempts++;
      const msg = buildMessage(
        MSG.HELLO,
        this._transport.getRoomId(),
        this._localPlayer.id,
        {
          playerInfo: {
            id: this._localPlayer.id,
            displayName: this._localPlayer.displayName,
            color: this._localPlayer.color,
            peerId: this._transport.getLocalPeerId(),
            isReady: false,
            isConnected: true,
            isHost: false,
          },
        }
      );
      this._transport.send(msg);
      console.log(`[RoomManager] Sent HELLO (attempt ${attempts})`);
      if (!this._state) {
        setTimeout(sendHello, 1000);
      }
    };

    // Give data channel 150ms to settle then send
    setTimeout(sendHello, 150);
  }

  // ----------------------------------------------------------------
  // Message handler
  // ----------------------------------------------------------------

  _onMessage({ message, fromPeerId }) {
    if (this._state && message.roomId !== this._state.roomId) {
      // Ignore messages for wrong room
      return;
    }

    switch (message.type) {
      case MSG.HELLO:
        if (this._isHost) this._handleHello(message, fromPeerId);
        break;

      case MSG.ROOM_SNAPSHOT:
        if (!this._isHost) this._handleSnapshot(message);
        break;

      case MSG.PLAYER_READY:
        if (this._isHost) this._handlePlayerReady(message);
        break;

      case MSG.GAME_SELECTED:
        if (!this._isHost) this._handleGameSelected(message);
        break;

      case MSG.KICK_PLAYER:
        if (!this._isHost) {
          // If we're the kicked player, disconnect
          if (message.payload.kickedPlayerId === this._localPlayer.id) {
            EventBus.emit('room:kicked', {});
          }
        }
        break;

      default:
        // Delegate to game lifecycle via event
        EventBus.emit('room:game-message', { message, fromPeerId });
    }
  }

  _handleHello(message, fromPeerId) {
    const { playerInfo } = message.payload;
    if (!playerInfo || !playerInfo.id) return;

    // Don't add duplicates
    const exists = this._state.players.find(p => p.id === playerInfo.id);
    if (!exists) {
      if (this._state.players.length >= 4) {
        // Room full
        this._transport.sendTo(fromPeerId, buildMessage(
          MSG.ERROR,
          this._state.roomId,
          this._localPlayer.id,
          { code: 'ROOM_FULL', message: 'This room is full' }
        ));
        return;
      }
      this.addPlayer({ ...playerInfo, peerId: fromPeerId });
    } else {
      // Reconnecting — update connection state
      this.setPlayerConnected(playerInfo.id, true);
    }
    this.broadcastSnapshot();
  }

  _handleSnapshot(message) {
    if (!message.payload || !message.payload.snapshot) return;
    this._state = message.payload.snapshot;
    console.log('[RoomManager] Received room snapshot');
    EventBus.emit('room:state-changed', this._state);
  }

  _handlePlayerReady(message) {
    const { isReady } = message.payload;
    this.setReady(message.playerId, isReady);
    this.broadcastSnapshot();
  }

  _handleGameSelected(message) {
    const { gameId, settings } = message.payload;
    if (this._state) {
      this._state = { ...this._state, selectedGameId: gameId, gameSettings: settings || {} };
      EventBus.emit('room:state-changed', this._state);
    }
  }

  // ----------------------------------------------------------------
  // State mutations (host only)
  // ----------------------------------------------------------------

  addPlayer(playerInfo) {
    if (!this._isHost || !this._state) return;
    this._state = {
      ...this._state,
      players: [...this._state.players, playerInfo],
    };
    EventBus.emit('room:state-changed', this._state);
  }

  removePlayer(playerId) {
    if (!this._isHost || !this._state) return;
    this._state = {
      ...this._state,
      players: this._state.players.filter(p => p.id !== playerId),
    };
    EventBus.emit('room:state-changed', this._state);
    this.broadcastSnapshot();
  }

  setReady(playerId, isReady) {
    if (!this._state) return;
    this._state = {
      ...this._state,
      players: this._state.players.map(p =>
        p.id === playerId ? { ...p, isReady } : p
      ),
    };
    EventBus.emit('room:state-changed', this._state);
  }

  setPlayerConnected(playerId, isConnected) {
    if (!this._state) return;
    this._state = {
      ...this._state,
      players: this._state.players.map(p =>
        p.id === playerId ? { ...p, isConnected } : p
      ),
    };
    EventBus.emit('room:state-changed', this._state);
  }

  /**
   * Host: select game and settings.
   * Broadcasts update to all clients.
   */
  selectGame(gameId, settings = {}) {
    if (!this._isHost || !this._state) return;
    this._state = {
      ...this._state,
      selectedGameId: gameId,
      gameSettings: settings,
    };
    EventBus.emit('room:state-changed', this._state);
    // Broadcast the selection
    this._transport.send(buildMessage(
      MSG.GAME_SELECTED,
      this._state.roomId,
      this._localPlayer.id,
      { gameId, settings }
    ));
  }

  /**
   * Client: signal ready state.
   */
  signalReady(isReady) {
    if (!this._state) return;
    // Optimistically update local state
    this.setReady(this._localPlayer.id, isReady);
    // Send to host
    this._transport.send(buildMessage(
      MSG.PLAYER_READY,
      this._state.roomId,
      this._localPlayer.id,
      { isReady }
    ));
  }

  /**
   * Host: kick a player.
   */
  kickPlayer(playerId) {
    if (!this._isHost || !this._state) return;
    this._transport.send(buildMessage(
      MSG.KICK_PLAYER,
      this._state.roomId,
      this._localPlayer.id,
      { kickedPlayerId: playerId }
    ));
    this.removePlayer(playerId);
  }

  /**
   * Set room phase.
   */
  setPhase(phase) {
    if (!this._state) return;
    this._state = { ...this._state, phase };
    EventBus.emit('room:state-changed', this._state);
  }

  // ----------------------------------------------------------------
  // Snapshot
  // ----------------------------------------------------------------

  getSnapshot() {
    return this._state;
  }

  broadcastSnapshot() {
    if (!this._isHost || !this._state) return;
    this._transport.send(buildMessage(
      MSG.ROOM_SNAPSHOT,
      this._state.roomId,
      this._localPlayer.id,
      { snapshot: this._state }
    ));
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  isHost() {
    return this._isHost;
  }

  canStart() {
    if (!this._state) return false;
    if (!this._state.selectedGameId) return false;
    if (this._state.players.length < 2) return false;
    return this._state.players.every(p => p.isReady);
  }

  destroy() {
    EventBus.off('multiplayer:message', this._onMessage);
    this._state = null;
  }
}
