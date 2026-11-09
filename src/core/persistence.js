/**
 * persistence.js — localStorage adapter
 * Party Hub core module
 *
 * All keys are namespaced under "ph:" to avoid collisions.
 */

const KEYS = {
  PLAYER: 'ph:player',
  PREFERENCES: 'ph:preferences',
  MATCH_HISTORY: 'ph:matchHistory',
};

const MAX_HISTORY = 50;

function safeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[Persistence] Failed to write to localStorage:', err);
    return false;
  }
}

export const Persistence = {
  /**
   * Save local player identity.
   * @param {{ id: string, displayName: string, color: string }} player
   */
  savePlayer(player) {
    return safeSet(KEYS.PLAYER, player);
  },

  /**
   * Load local player identity.
   * @returns {{ id: string, displayName: string, color: string } | null}
   */
  loadPlayer() {
    return safeGet(KEYS.PLAYER, null);
  },

  /**
   * Save a completed match record.
   * @param {object} record
   */
  saveMatchRecord(record) {
    const history = this.loadMatchHistory();
    history.unshift({ ...record, savedAt: Date.now() });
    // Trim to max
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    return safeSet(KEYS.MATCH_HISTORY, history);
  },

  /**
   * Load all match history records.
   * @returns {object[]}
   */
  loadMatchHistory() {
    return safeGet(KEYS.MATCH_HISTORY, []);
  },

  /**
   * Clear match history.
   */
  clearMatchHistory() {
    localStorage.removeItem(KEYS.MATCH_HISTORY);
  },

  /**
   * Save user preferences.
   * @param {object} prefs
   */
  savePreferences(prefs) {
    const existing = this.loadPreferences();
    return safeSet(KEYS.PREFERENCES, { ...existing, ...prefs });
  },

  /**
   * Load user preferences.
   * @returns {object}
   */
  loadPreferences() {
    return safeGet(KEYS.PREFERENCES, {});
  },

  /**
   * Check if localStorage is available.
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const test = '__ph_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
};
