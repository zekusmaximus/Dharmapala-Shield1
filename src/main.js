import GameBootstrap from '../js/main.js';

window.addEventListener('DOMContentLoaded', () => {
  // Guard against double-bootstrapping (see js/main.js). Whichever entry fires
  // first wins; the other becomes a no-op.
  if (window.__dharmapalaBootstrapped) return;
  window.__dharmapalaBootstrapped = true;
  const bootstrap = new GameBootstrap();
  bootstrap.init();
});