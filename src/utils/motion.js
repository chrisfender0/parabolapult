// Single source of truth for the player's OS-level reduced-motion
// preference — camera shake/follow, slow-mo, idle drift, and the CSS
// animations in style.css all defer to this (JS side checks this; the
// CSS side has its own `@media (prefers-reduced-motion: reduce)` block).
export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
