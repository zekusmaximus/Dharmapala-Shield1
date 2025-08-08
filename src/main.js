import GameBootstrap from '../js/main.js';
import CONFIG from '../js/config.js';
import Utils from '../js/utils.js';

// Temporary shims for legacy modules during migration
window.LegacyDeps = window.LegacyDeps || {};
window.LegacyDeps.CONFIG = CONFIG;
window.LegacyDeps.Utils = Utils;

window.addEventListener('DOMContentLoaded', () => {
  const bootstrap = new GameBootstrap();
  bootstrap.init();
});