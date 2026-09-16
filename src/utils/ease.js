// Shared easing curves, t in [0, 1] in, eased value out. Kept as pure
// functions (no three.js/DOM) so both effects.js (three.js meshes) and any
// future DOM-driven animation can use the exact same curves.

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeInQuad(t) {
  return t * t;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}
