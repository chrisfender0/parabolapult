// Dev/testing aids — console hooks (window.__game, window.projectile, ...)
// and the target's marker number (the HUD readout + the floating label
// above the container, both of which hand over the round's answer) — are
// only active when explicitly enabled. The player is meant to read the
// target's position off the ruler themselves; a visible number defeats
// that. Toggle from the console with __enableDebug() / __disableDebug(),
// then reload.
const FLAG_KEY = 'parabolapult:debug';

export function isDebugEnabled() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/** Attaches `hooks` (e.g. { __game, projectile, target }) to window, only if debug mode is on. */
export function exposeDebugHooks(hooks) {
  if (!isDebugEnabled()) return;
  Object.assign(window, hooks);
}

window.__enableDebug = function __enableDebug() {
  try {
    localStorage.setItem(FLAG_KEY, '1');
  } catch {
    // Ignore — non-critical.
  }
  console.log('[debug] enabled — reload the page to expose window.__game / projectile / target and reveal the target marker number');
};

window.__disableDebug = function __disableDebug() {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    // Ignore — non-critical.
  }
  console.log('[debug] disabled — reload the page to remove debug hooks');
};
