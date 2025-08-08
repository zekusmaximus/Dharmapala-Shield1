import GameBootstrap from '../js/main.js';
import CONFIG from '../js/config.js';
import Utils from '../js/utils.js';

// Temporary shims for legacy modules during migration
window.CONFIG = CONFIG;
window.Utils = Utils;

window.addEventListener('DOMContentLoaded', () => {
  const bootstrap = new GameBootstrap();
  bootstrap.init();
});