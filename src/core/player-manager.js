/**
 * player-manager.js — Guest identity and player state management
 * Party Hub core module
 */

import { Persistence } from './persistence.js';

/** Avatar color palette — 8 distinct, vibrant colors */
const AVATAR_COLORS = [
  '#58a6ff', // electric blue
  '#bc8cff', // violet
  '#f97316', // orange
  '#3fb950', // green
  '#f85149', // red
  '#f5c842', // gold
  '#22d3ee', // cyan
  '#fb7185', // pink
];

/**
 * Generate a random guest display name like "Guest#4821".
 */
function generateDisplayName() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Guest#${num}`;
}

/**
 * Pick a random avatar color from the palette.
 * @param {string} [seed] - Optional string seed to pick deterministically
 */
function pickColor(seed) {
  if (seed) {
    // Deterministic pick based on seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Generate initials from a display name (up to 2 chars).
 * @param {string} name
 * @returns {string}
 */
export function getAvatarInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s#_-]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Singleton: the current local player */
let _localPlayer = null;

export const PlayerManager = {
  /**
   * Get or create the local player identity.
   * Loads from persistence; creates and saves if not found.
   * @returns {{ id: string, displayName: string, color: string }}
   */
  getLocalPlayer() {
    if (_localPlayer) return _localPlayer;

    const saved = Persistence.loadPlayer();
    if (saved && saved.id && saved.displayName && saved.color) {
      _localPlayer = saved;
      return _localPlayer;
    }

    // Create new guest identity
    const id = crypto.randomUUID();
    const displayName = generateDisplayName();
    const color = pickColor(id);

    _localPlayer = { id, displayName, color };
    Persistence.savePlayer(_localPlayer);
    return _localPlayer;
  },

  /**
   * Update the local player's display name.
   * @param {string} name
   * @returns {{ id: string, displayName: string, color: string }}
   */
  updateDisplayName(name) {
    const trimmed = name.trim().slice(0, 24); // max 24 chars
    if (!trimmed) throw new Error('Display name cannot be empty');
    if (!_localPlayer) this.getLocalPlayer();
    _localPlayer = { ..._localPlayer, displayName: trimmed };
    Persistence.savePlayer(_localPlayer);
    return _localPlayer;
  },

  /**
   * Update the local player's color.
   * @param {string} color - Hex color string
   */
  updateColor(color) {
    if (!_localPlayer) this.getLocalPlayer();
    _localPlayer = { ..._localPlayer, color };
    Persistence.savePlayer(_localPlayer);
    return _localPlayer;
  },

  /**
   * Get avatar initials for a given name.
   * @param {string} name
   * @returns {string}
   */
  getAvatarInitials,

  /**
   * Get all available avatar colors.
   * @returns {string[]}
   */
  getAvatarColors() {
    return [...AVATAR_COLORS];
  },

  /**
   * Pick a color by index from the palette.
   * @param {number} index
   * @returns {string}
   */
  getColorByIndex(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  },

  /**
   * Reset player identity (for testing/debugging).
   */
  resetIdentity() {
    _localPlayer = null;
    Persistence.savePlayer(null);
  },
};
