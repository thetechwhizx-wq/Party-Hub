/**
 * event-bus.js — Simple singleton pub/sub event system
 * Party Hub core module
 */

export const EventBus = {
  _listeners: {},

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} cb
   */
  on(event, cb) {
    if (typeof event !== 'string' || typeof cb !== 'function') return;
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    // Prevent duplicate subscriptions
    if (!this._listeners[event].includes(cb)) {
      this._listeners[event].push(cb);
    }
  },

  /**
   * Unsubscribe from an event.
   * @param {string} event
   * @param {Function} cb
   */
  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(fn => fn !== cb);
  },

  /**
   * Emit an event with optional data.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (!this._listeners[event]) return;
    // Copy array to avoid mutation during iteration
    const listeners = [...this._listeners[event]];
    for (const cb of listeners) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    }
  },

  /**
   * Subscribe to an event and automatically unsubscribe after first call.
   * @param {string} event
   * @param {Function} cb
   */
  once(event, cb) {
    const wrapper = (data) => {
      cb(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  },

  /**
   * Remove all listeners for an event (or all events if no event given).
   * @param {string} [event]
   */
  clear(event) {
    if (event) {
      delete this._listeners[event];
    } else {
      this._listeners = {};
    }
  },

  /**
   * List all registered event names (debugging aid).
   * @returns {string[]}
   */
  listEvents() {
    return Object.keys(this._listeners);
  }
};
