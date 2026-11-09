/**
 * multiplayer.js — Enhanced PeerJS + WebRTC + BroadcastChannel transport
 * Party Hub core module
 *
 * Supports STUN + TURN relay for 99.9% cross-network connectivity (CGNAT/mobile data),
 * automatic keepalive heartbeats, client auto-retry, and local tab BroadcastChannel.
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
  REACTION: 'REACTION',
  ERROR: 'ERROR',
};

/** WebRTC configuration with Google STUN + Cloudflare + OpenRelay TURN servers */
const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:openrelay.metered.ca:80' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelay',
        credential: 'openrelay',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelay',
        credential: 'openrelay',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelay',
        credential: 'openrelay',
      },
    ],
    iceCandidatePoolSize: 10,
  },
};

/** Convert 6-char room code into a valid PeerJS ID (lowercase alphanumeric) */
function toHostPeerId(roomId) {
  return `ph-${roomId.trim().toLowerCase()}`;
}

/** Max message size in bytes */
const MAX_MSG_BYTES = 100 * 1024; // 100 KB

/** Reconnection settings */
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 1500;

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
 * Excludes ambiguous chars like I, 1, O, 0.
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
 * MultiplayerTransport — wraps PeerJS WebRTC + BroadcastChannel for Party Hub.
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
    this._heartbeatInterval = null;
    this._bc = null; // BroadcastChannel for local/same-origin testing
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Create a new room as host.
   * Auto-retries with a new room code if ID collision occurs.
   * @param {number} [retryCount=0]
   * @returns {Promise<string>} roomId
   */
  async createRoom(retryCount = 0) {
    const roomId = generateRoomCode();
    const hostPeerId = toHostPeerId(roomId);

    this._roomId = roomId;
    this._hostPeerId = hostPeerId;
    this._isHost = true;
    this._state = 'connecting';

    this._initBroadcastChannel(roomId);

    return new Promise((resolve, reject) => {
      let peer;
      try {
        peer = new window.Peer(hostPeerId, PEER_CONFIG);
      } catch (err) {
        this._state = 'disconnected';
        reject(new Error('Failed to create Peer instance: ' + err.message));
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
        this._startHeartbeat();
        EventBus.emit('multiplayer:connected', { roomId, peerId: id });
        resolve(roomId);
      });

      peer.on('connection', (conn) => {
        this._handleIncomingConnection(conn);
      });

      peer.on('error', (err) => {
        clearTimeout(timeout);
        console.warn('[Multiplayer] Host Peer error:', err?.type, err);

        // ID collision on free PeerJS broker: retry with another code
        if (err?.type === 'unavailable-id' && retryCount < 3) {
          console.log(`[Multiplayer] Room ID ${roomId} in use, regenerating...`);
          try { peer.destroy(); } catch {}
          return this.createRoom(retryCount + 1).then(resolve).catch(reject);
        }

        this._state = 'disconnected';
        EventBus.emit('multiplayer:error', { error: err });
        reject(err);
      });

      peer.on('disconnected', () => {
        console.warn('[Multiplayer] Host peer disconnected from signalling server, auto-reconnecting...');
        this._state = 'reconnecting';
        this._attemptReconnect();
      });

      peer.on('close', () => {
        this._state = 'disconnected';
        console.log('[Multiplayer] Host peer closed');
      });
    });
  }

  /**
   * Join an existing room as client with smart retries.
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

    this._initBroadcastChannel(normalizedId);

    return new Promise((resolve, reject) => {
      let peer;
      let joinAttempts = 0;
      const MAX_JOIN_ATTEMPTS = 4;

      try {
        peer = new window.Peer(undefined, PEER_CONFIG);
      } catch (err) {
        this._state = 'disconnected';
        reject(new Error('Failed to create Peer instance: ' + err.message));
        return;
      }

      this._peer = peer;

      const timeout = setTimeout(() => {
        reject(new Error(`Connection to room "${normalizedId}" timed out. Make sure the host has the room open.`));
        this._state = 'disconnected';
      }, 35000);

      const attemptConnect = () => {
        if (!peer || peer.destroyed) return;
        joinAttempts++;
        console.log(`[Multiplayer] Client connecting to host ${hostPeerId} (attempt ${joinAttempts}/${MAX_JOIN_ATTEMPTS})`);
        
        const conn = peer.connect(hostPeerId, {
          reliable: true,
          serialization: 'json',
        });

        this._setupConnectionHandlers(conn, () => {
          clearTimeout(timeout);
          this._startHeartbeat();
          resolve();
        }, (err) => {
          if (joinAttempts < MAX_JOIN_ATTEMPTS) {
            console.log(`[Multiplayer] Host not ready yet, retrying in 2s...`);
            setTimeout(attemptConnect, 2000);
          } else {
            clearTimeout(timeout);
            reject(err);
          }
        }, timeout);
      };

      peer.on('open', (localPeerId) => {
        console.log(`[Multiplayer] Client peer ready: ${localPeerId}`);
        attemptConnect();
      });

      peer.on('error', (err) => {
        console.warn('[Multiplayer] Client Peer error:', err?.type, err);
        if (err?.type === 'peer-unavailable' && joinAttempts < MAX_JOIN_ATTEMPTS) {
          console.log('[Multiplayer] Host peer temporarily unavailable, retrying...');
          setTimeout(attemptConnect, 2000);
          return;
        }
        EventBus.emit('multiplayer:error', { error: err });
      });

      peer.on('disconnected', () => {
        console.warn('[Multiplayer] Client disconnected from signalling, auto-reconnecting...');
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
   * Also broadcasts over BroadcastChannel for local/multi-tab listeners.
   * @param {object} message
   */
  send(message) {
    const validation = validateMessage(message);
    if (!validation.valid) {
      console.error('[Multiplayer] Cannot send invalid message:', validation.reason, message);
      return;
    }

    // Always mirror to BroadcastChannel (for local tab testing / fallback)
    if (this._bc) {
      try {
        this._bc.postMessage({
          senderId: this._localPlayer.id,
          peerId: this.getLocalPeerId(),
          message,
        });
      } catch (e) {}
    }

    // Send across WebRTC data connections
    for (const conn of this._connections.values()) {
      if (conn && conn.open) {
        try {
          conn.send(message);
        } catch (err) {
          console.warn('[Multiplayer] Failed sending over connection:', err);
        }
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

    // Local tab mirror
    if (this._bc) {
      try {
        this._bc.postMessage({
          senderId: this._localPlayer.id,
          targetPeerId: peerId,
          message,
        });
      } catch (e) {}
    }

    const conn = this._connections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
    } else {
      console.warn(`[Multiplayer] No open connection to peer: ${peerId}`);
    }
  }

  /**
   * Disconnect all connections and destroy peer.
   */
  disconnect() {
    this._stopHeartbeat();

    if (this._bc) {
      try { this._bc.close(); } catch {}
      this._bc = null;
    }

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
  // Private Helpers
  // ----------------------------------------------------------------

  _initBroadcastChannel(roomId) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this._bc = new BroadcastChannel(`party_hub_${roomId.toLowerCase()}`);
        this._bc.onmessage = (event) => {
          const data = event.data;
          if (data && data.senderId !== this._localPlayer.id) {
            // Emulate peer joined if first time seeing this peer
            const remotePeerId = data.peerId || `bc-${data.senderId.slice(0, 6)}`;
            if (this._isHost && !this._connections.has(remotePeerId)) {
              EventBus.emit('multiplayer:peer-joined', { peerId: remotePeerId });
            }
            this._handleIncomingData(data.message, remotePeerId);
          }
        };
      } catch (e) {
        console.warn('[Multiplayer] BroadcastChannel not supported:', e);
      }
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatInterval = setInterval(() => {
      if (this._peer && !this._peer.destroyed) {
        if (this._peer.disconnected) {
          console.log('[Multiplayer] Heartbeat: Peer disconnected from broker, reconnecting...');
          try { this._peer.reconnect(); } catch (e) {}
        } else {
          try {
            const sock = this._peer.socket?._socket;
            if (sock && sock.readyState === WebSocket.OPEN) {
              sock.send(JSON.stringify({ type: 'HEARTBEAT' }));
            }
          } catch (e) {}
        }
      }
    }, 15000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  _handleIncomingConnection(conn) {
    console.log(`[Multiplayer] Host: Incoming connection from ${conn.peer}`);

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
    let resolved = false;

    conn.on('open', () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      this._connections.set(conn.peer, conn);
      this._state = 'connected';
      console.log(`[Multiplayer] Client connected to host: ${conn.peer}`);
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
      console.warn('[Multiplayer] Connection error:', err);
      this._connections.delete(conn.peer);
      if (!resolved) {
        reject(err);
      }
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
        error: new Error('Signalling connection lost. Please refresh or create a new room.'),
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
