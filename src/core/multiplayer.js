/**
 * multiplayer.js — PeerJS transport abstraction
 * Party Hub core module
 *
 * Host peer ID pattern: ph-{ROOMID}
 * e.g., host for room "ABCD12" → peer ID "ph-ABCD12"
 */

import { EventBus } from './event-bus.js';

/** Message type constants */
export const MSG = {
  HELLO: 'HELLO',
  ROOM_SNAPSHOT: 'ROOM_SNAPSHOT',
  PLAYER_READY: 'PLAYER_READY',
  GAME_SELECTED: 'GAME_SELECTED',
  GAME_START: 'GAME_START',
  PLAYER_ACTION: 'PLAYER_ACTION',
  STATE_UPDATE: 'STATE_UPDATE',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
  PLAYER_RECONNECTED: 'PLAYER_RECONNECTED',
  MATCH_FINISHED: 'MATCH_FINISHED',
  REMATCH_REQUEST: 'REMATCH_REQUEST',
  REMATCH_ACCEPT: 'REMATCH_ACCEPT',
  KICK_PLAYER: 'KICK_PLAYER',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  ERROR: 'ERROR',
};

/** WebRTC configuration with Google public STUN servers */
const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  },
};

/** Convert 6-char room code into a valid PeerJS ID (lowercase alphanumeric) */
function toHostPeerId(roomId) {
  return `ph-${roomId.trim().toLowerCase()}`;
}

/** Reconnection settings */
const RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

/**
 * Build a standard message envelope.
 * @param {string} type - MSG constant
 * @param {string} roomId
 * @param {string} playerId
 * @param {object} [payload]
 * @returns {object}
 */
export function buildMessage(type, roomId, playerId, payload = {}) {
  return {
    type,
    roomId,
    matchId: payload.matchId || null,
    actionId: payload.actionId || crypto.randomUUID(),
    playerId,
    timestamp: Date.now(),
    payload,
  };
}

/**
 * Validate incoming message shape.
 * @param {*} msg
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateMessage(msg) {
  if (!msg || typeof msg !== 'object') {
    return { valid: false, reason: 'Message is not an object' };
  }
  if (!msg.type || typeof msg.type !== 'string') {
    return { valid: false, reason: 'Missing or invalid type' };
  }
  if (!msg.roomId || typeof msg.roomId !== 'string') {
    return { valid: false, reason: 'Missing or invalid roomId' };
  }
  if (!msg.playerId || typeof msg.playerId !== 'string') {
    return { valid: false, reason: 'Missing or invalid playerId' };
  }
  // Check size (approximate)
  try {
    const size = new TextEncoder().encode(JSON.stringify(msg)).length;
    if (size > MAX_MSG_BYTES) {
      return { valid: false, reason: `Message too large (${size} bytes)` };
    }
  } catch {
    return { valid: false, reason: 'Could not serialize message' };
  }
  return { valid: true };
}

/**
 * Generate a 6-character uppercase alphanumeric room code.
 * @returns {string}
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * MultiplayerTransport — wraps PeerJS for Party Hub.
 *
 * Usage:
 *   const transport = new MultiplayerTransport(localPlayer);
 *   const roomId = await transport.createRoom(); // host
 *   await transport.joinRoom(roomId);            // client
 *
 * Events emitted on EventBus:
 *   multiplayer:message      { message, fromPeerId }
 *   multiplayer:connected    { roomId, peerId }
 *   multiplayer:disconnected { roomId, peerId }
 *   multiplayer:error        { error }
 *   multiplayer:peer-joined  { peerId }
 *   multiplayer:peer-left    { peerId }
 */
export class MultiplayerTransport {
  constructor(localPlayer) {
    this._localPlayer = localPlayer;
    this._peer = null;
    this._connections = new Map(); // peerId -> DataConnection
    this._roomId = null;
    this._hostPeerId = null;
    this._isHost = false;
    this._state = 'disconnected';
    this._reconnectAttempts = 0;
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Create a new room as host.
   * @returns {Promise<string>} roomId
   */
  async createRoom() {
    const roomId = generateRoomCode();
    const hostPeerId = toHostPeerId(roomId);

    this._roomId = roomId;
    this._hostPeerId = hostPeerId;
    this._isHost = true;
    this._state = 'connecting';

    return new Promise((resolve, reject) => {
      let peer;
      try {
        peer = new window.Peer(hostPeerId, PEER_CONFIG);
      } catch (err) {
        this._state = 'disconnected';
        reject(new Error('Failed to create Peer: ' + err.message));
        return;
      }

      this._peer = peer;

      const timeout = setTimeout(() => {
        reject(new Error('Signaling server connection timed out. Please check your internet connection.'));
        this._state = 'disconnected';
      }, 30000);

      peer.on('open', (id) => {
        clearTimeout(timeout);
        this._state = 'connected';
        console.log(`[Multiplayer] Host peer open: ${id}, room: ${roomId}`);
        EventBus.emit('multiplayer:connected', { roomId, peerId: id });
        resolve(roomId);
      });

      peer.on('connection', (conn) => {
        this._handleIncomingConnection(conn);
      });

      peer.on('error', (err) => {
        clearTimeout(timeout);
        console.error('[Multiplayer] Host Peer error:', err);
        this._state = 'disconnected';
        EventBus.emit('multiplayer:error', { error: err });
        reject(err);
      });

      peer.on('disconnected', () => {
        console.warn('[Multiplayer] Host peer disconnected from signalling server');
        this._state = 'reconnecting';
        this._attemptReconnect();
      });

      peer.on('close', () => {
        this._state = 'disconnected';
        console.log('[Multiplayer] Peer closed');
      });
    });
  }

  /**
   * Join an existing room as client.
   * @param {string} roomId
   * @returns {Promise<void>}
   */
  async joinRoom(roomId) {
    const normalizedId = roomId.trim().toUpperCase();
    const hostPeerId = toHostPeerId(normalizedId);

    this._roomId = normalizedId;
    this._hostPeerId = hostPeerId;
    this._isHost = false;
    this._state = 'connecting';

    return new Promise((resolve, reject) => {
      let peer;
      try {
        peer = new window.Peer(undefined, PEER_CONFIG);
      } catch (err) {
        this._state = 'disconnected';
        reject(new Error('Failed to create Peer: ' + err.message));
        return;
      }

      this._peer = peer;

      const timeout = setTimeout(() => {
        reject(new Error(`Connection to room "${normalizedId}" timed out. Make sure the host has the room open.`));
        this._state = 'disconnected';
      }, 30000);

      peer.on('open', (localPeerId) => {
        console.log(`[Multiplayer] Client peer open: ${localPeerId}, joining host: ${hostPeerId}`);
        const conn = peer.connect(hostPeerId, {
          reliable: true,
          serialization: 'json',
        });

        this._setupConnectionHandlers(conn, resolve, reject, timeout);
      });

      peer.on('error', (err) => {
        clearTimeout(timeout);
        console.error('[Multiplayer] Client Peer error:', err);
        this._state = 'disconnected';
        EventBus.emit('multiplayer:error', { error: err });
        reject(err);
      });

      peer.on('disconnected', () => {
        console.warn('[Multiplayer] Client peer disconnected from signalling server');
        this._state = 'reconnecting';
        this._attemptReconnect();
      });

      peer.on('close', () => {
        this._state = 'disconnected';
      });
    });
  }
        this._state = 'reconnecting';
        this._attemptReconnect();
      });

      peer.on('close', () => {
        this._state = 'disconnected';
      });
    });
  }

  /**
   * Send a message to all connected peers.
   * Host: broadcasts to all clients.
   * Client: sends to host only.
   * @param {object} message
   */
  send(message) {
    const validation = validateMessage(message);
    if (!validation.valid) {
      console.error('[Multiplayer] Cannot send invalid message:', validation.reason, message);
      return;
    }

    if (this._connections.size === 0) {
      console.warn('[Multiplayer] No connections to send to');
      return;
    }

    for (const conn of this._connections.values()) {
      if (conn.open) {
        conn.send(message);
      }
    }
  }

  /**
   * Send a message to a specific peer.
   * @param {string} peerId
   * @param {object} message
   */
  sendTo(peerId, message) {
    const validation = validateMessage(message);
    if (!validation.valid) {
      console.error('[Multiplayer] Cannot sendTo with invalid message:', validation.reason);
      return;
    }
    const conn = this._connections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
    } else {
      console.warn(`[Multiplayer] No open connection to peer: ${peerId}`);
    }
  }

  /**
   * Disconnect all connections and destroy the peer.
   */
  disconnect() {
    for (const conn of this._connections.values()) {
      try { conn.close(); } catch {}
    }
    this._connections.clear();
    if (this._peer && !this._peer.destroyed) {
      try { this._peer.destroy(); } catch {}
    }
    this._peer = null;
    this._roomId = null;
    this._hostPeerId = null;
    this._isHost = false;
    this._state = 'disconnected';
    this._reconnectAttempts = 0;
  }

  /** @returns {'disconnected'|'connecting'|'connected'|'reconnecting'} */
  getState() {
    return this._state;
  }

  /** @returns {boolean} */
  isHost() {
    return this._isHost;
  }

  /** @returns {string|null} */
  getLocalPeerId() {
    return this._peer ? this._peer.id : null;
  }

  /** @returns {string|null} */
  getRoomId() {
    return this._roomId;
  }

  /** @returns {string[]} */
  getConnectedPeerIds() {
    return Array.from(this._connections.keys());
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  _handleIncomingConnection(conn) {
    console.log(`[Multiplayer] Incoming connection from: ${conn.peer}`);

    conn.on('open', () => {
      this._connections.set(conn.peer, conn);
      console.log(`[Multiplayer] Connection established with: ${conn.peer}`);
      EventBus.emit('multiplayer:peer-joined', { peerId: conn.peer });
    });

    conn.on('data', (data) => {
      this._handleIncomingData(data, conn.peer);
    });

    conn.on('close', () => {
      this._connections.delete(conn.peer);
      console.log(`[Multiplayer] Connection closed: ${conn.peer}`);
      EventBus.emit('multiplayer:peer-left', { peerId: conn.peer });
    });

    conn.on('error', (err) => {
      console.error(`[Multiplayer] Connection error with ${conn.peer}:`, err);
      this._connections.delete(conn.peer);
      EventBus.emit('multiplayer:error', { error: err, peerId: conn.peer });
    });
  }

  _setupConnectionHandlers(conn, resolve, reject, timeout) {
    conn.on('open', () => {
      clearTimeout(timeout);
      this._connections.set(conn.peer, conn);
      this._state = 'connected';
      console.log(`[Multiplayer] Connected to host: ${conn.peer}`);
      EventBus.emit('multiplayer:connected', { roomId: this._roomId, peerId: conn.peer });
      resolve();
    });

    conn.on('data', (data) => {
      this._handleIncomingData(data, conn.peer);
    });

    conn.on('close', () => {
      this._connections.delete(conn.peer);
      this._state = 'disconnected';
      console.log(`[Multiplayer] Host connection closed`);
      EventBus.emit('multiplayer:disconnected', { roomId: this._roomId, peerId: conn.peer });
    });

    conn.on('error', (err) => {
      clearTimeout(timeout);
      console.error('[Multiplayer] Connection error:', err);
      this._connections.delete(conn.peer);
      this._state = 'disconnected';
      EventBus.emit('multiplayer:error', { error: err });
      reject(err);
    });
  }

  _handleIncomingData(data, fromPeerId) {
    const validation = validateMessage(data);
    if (!validation.valid) {
      console.warn(`[Multiplayer] Rejected invalid message from ${fromPeerId}: ${validation.reason}`);
      return;
    }
    EventBus.emit('multiplayer:message', { message: data, fromPeerId });
  }

  _attemptReconnect() {
    if (this._reconnectAttempts >= RECONNECT_ATTEMPTS) {
      console.error('[Multiplayer] Max reconnection attempts reached');
      this._state = 'disconnected';
      EventBus.emit('multiplayer:error', {
        error: new Error('Could not reconnect to signalling server after multiple attempts'),
      });
      return;
    }

    this._reconnectAttempts++;
    const attempt = this._reconnectAttempts;

    setTimeout(() => {
      if (this._peer && !this._peer.destroyed) {
        console.log(`[Multiplayer] Reconnect attempt ${attempt}/${RECONNECT_ATTEMPTS}`);
        try {
          this._peer.reconnect();
        } catch (err) {
          console.error('[Multiplayer] Reconnect failed:', err);
        }
      }
    }, RECONNECT_DELAY_MS * attempt);
  }
}
