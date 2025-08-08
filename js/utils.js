const Utils = {
  performance: window.performance || { now: () => Date.now() },
  math: {
    distance(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.hypot(dx, dy);
    }
  },
  dom: {
    /**
     * Selects the first element that matches the selector.
     * @param {string} selector
     * @returns {Element|null}
     */
    $(selector) {
      return document.querySelector(selector);
    },
    /**
     * Shows the given element by resetting its display style.
     * @param {Element} el
     */
    show(el) {
      if (el && el.style) {
        el.style.display = '';
      }
    },
    /**
     * Hides the given element by setting its display style to 'none'.
     * @param {Element} el
     */
    hide(el) {
      if (el && el.style) {
        el.style.display = 'none';
      }
    }
  }
};

export default Utils;
export { Utils };