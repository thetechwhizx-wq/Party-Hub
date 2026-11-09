/**
 * navigation.js — SPA router and navigation bar
 * Party Hub UI module
 *
 * Hash-based routing:
 *   #home, #library, #profile, #lobby, #play, #results
 */

import { EventBus } from '../core/event-bus.js';

/** All registered routes: { pattern: RegExp, handler: Function } */
const routes = [];

/** Current active route */
let currentRoute = null;

/**
 * Register a route.
 * @param {string|RegExp} path - e.g., 'home', /^game\/(.+)$/
 * @param {Function} handler - (params) => void
 */
export function registerRoute(path, handler) {
  const pattern = path instanceof RegExp ? path : new RegExp(`^${path}$`);
  routes.push({ pattern, handler });
}

/**
 * Navigate to a hash route.
 * @param {string} route - e.g., 'home', 'library', 'lobby'
 */
export function navigate(route) {
  window.location.hash = route;
}

/**
 * Parse the current hash and dispatch to the matching route handler.
 */
function dispatch() {
  const hash = window.location.hash.slice(1) || 'home';

  // Update nav links
  document.querySelectorAll('.nav-link[data-route]').forEach(link => {
    link.classList.toggle('active', link.dataset.route === hash);
  });

  currentRoute = hash;
  EventBus.emit('nav:route-changed', { route: hash });

  for (const { pattern, handler } of routes) {
    const match = hash.match(pattern);
    if (match) {
      try {
        handler(match.slice(1));
      } catch (err) {
        console.error('[Navigation] Route handler error:', err);
        EventBus.emit('nav:error', { route: hash, error: err });
      }
      return;
    }
  }

  // No match — go home
  navigate('home');
}

/**
 * Initialise the router.
 * Call this once during app bootstrap.
 */
export function initRouter() {
  window.addEventListener('hashchange', dispatch);

  // Trigger initial route
  dispatch();
}

/**
 * Get the current route string.
 * @returns {string}
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Update the nav connection dot.
 * @param {'connected'|'connecting'|'disconnected'|'reconnecting'} state
 */
export function setNavConnectionState(state) {
  const dot = document.getElementById('nav-connection-status');
  if (!dot) return;
  dot.className = `connection-dot dot-${state}`;
  const labels = {
    connected: 'Connected to room',
    connecting: 'Connecting…',
    disconnected: 'Not in a room',
    reconnecting: 'Reconnecting…',
  };
  dot.title = labels[state] || state;
}
