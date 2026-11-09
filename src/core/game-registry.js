/**
 * game-registry.js — Register and lookup game modules
 * Party Hub core module
 */

const registry = new Map();

export const GameRegistry = {
  /**
   * Register a game module.
   * @param {object} module - Game module with metadata.id
   * @throws {Error} If module is missing metadata.id or already registered
   */
  register(module) {
    if (!module || !module.metadata || !module.metadata.id) {
      throw new Error('[GameRegistry] Module must have metadata.id');
    }
    const { id } = module.metadata;
    if (registry.has(id)) {
      console.warn(`[GameRegistry] Game "${id}" is already registered. Skipping.`);
      return;
    }
    registry.set(id, module);
    console.log(`[GameRegistry] Registered game: "${id}"`);
  },

  /**
   * Get a game module by ID.
   * @param {string} id
   * @returns {object | undefined}
   */
  get(id) {
    return registry.get(id);
  },

  /**
   * Get all registered game modules.
   * @returns {object[]}
   */
  getAll() {
    return Array.from(registry.values());
  },

  /**
   * Check if a game is registered.
   * @param {string} id
   * @returns {boolean}
   */
  isRegistered(id) {
    return registry.has(id);
  },

  /**
   * Unregister a game by ID (useful for testing).
   * @param {string} id
   */
  unregister(id) {
    registry.delete(id);
  },

  /**
   * Get all games matching a category.
   * @param {string} category
   * @returns {object[]}
   */
  getByCategory(category) {
    return this.getAll().filter(m => m.metadata.category === category);
  },

  /**
   * Total count of registered games.
   * @returns {number}
   */
  count() {
    return registry.size;
  },
};
