const Utils = {
  performance: window.performance || { now: () => Date.now() },
  math: {
    distance(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.hypot(dx, dy);
    }
  },
  dom: {}
};

export default Utils;
export { Utils };