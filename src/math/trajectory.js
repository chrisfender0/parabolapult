// Pure trajectory math for a parabolic launch. No three.js imports — every
// function here takes and returns plain numbers/objects, so it can be
// pasted straight into a console and exercised on its own (see the
// import.meta.env.DEV block at the bottom).
//
// The parabola is anchored at the launcher (x = 0, y = 0) and lands at
// x = landingX:
//
//   y(x) = k * x * (landingX - x)
//   k    = 4 * apex / landingX^2
//
// apex is a fixed world-unit height, so a shot to 4 and a shot to 20 both
// reach the same peak height — only the shape (how "flat" the arc looks)
// changes with distance. Apex is always at x = landingX / 2, which falls
// out of the formula rather than being asserted separately.

export const APEX_HEIGHT = 5;

// A miss on landingX <= 0 (or a non-finite value slipping through from a
// bad equation answer) has no real parabola — k would divide by zero or
// go negative. Callers get a flat, near-instant "fizzle" trajectory back
// instead of a thrown error, so flight/landing code doesn't need a special
// case for invalid input.
const FIZZLE_DURATION = 0.4;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Sublinear so short shots don't feel instant and long shots don't drag.
// Starting point from the plan; tuned for feel in session 11.
function computeDuration(landingX) {
  return clamp(0.55 * Math.sqrt(landingX) + 0.4, 0.9, 2.2);
}

function makeNullTrajectory(landingX) {
  return {
    landingX,
    k: 0,
    apexX: 0,
    apexY: 0,
    duration: FIZZLE_DURATION,
    isNull: true,
    yAt: () => 0,
    pointAt: () => ({ x: 0, y: 0 }),
    sample: (count) => Array.from({ length: Math.max(count, 0) + 1 }, () => ({ x: 0, y: 0 })),
  };
}

/**
 * Build a trajectory that lands at `landingX`.
 *
 * @param {number} landingX - where the projectile lands; must be > 0.
 * @param {{ apex?: number }} [options]
 * @returns {{
 *   landingX: number, k: number, apexX: number, apexY: number,
 *   duration: number, isNull: boolean,
 *   yAt: (x: number) => number,
 *   pointAt: (t: number) => { x: number, y: number },
 *   sample: (count: number) => Array<{ x: number, y: number }>,
 * }}
 */
export function makeTrajectory(landingX, { apex = APEX_HEIGHT } = {}) {
  if (!Number.isFinite(landingX) || landingX <= 0) {
    return makeNullTrajectory(landingX);
  }

  const A = landingX;
  const H = apex;
  const k = (4 * H) / (A * A);

  function yAt(x) {
    return k * x * (A - x);
  }

  // x advances linearly with t — constant horizontal velocity, same as a
  // real projectile under gravity alone. y comes from the parabola itself,
  // so the arc's vertical motion is whatever falls out of yAt.
  function pointAt(t) {
    const x = A * clamp(t, 0, 1);
    return { x, y: yAt(x) };
  }

  function sample(count) {
    const n = Math.max(count, 1);
    const points = [];
    for (let i = 0; i <= n; i += 1) {
      points.push(pointAt(i / n));
    }
    return points;
  }

  return {
    landingX: A,
    k,
    apexX: A / 2,
    apexY: H,
    duration: computeDuration(A),
    isNull: false,
    yAt,
    pointAt,
    sample,
  };
}

// Display string for the HUD's equation readout. The number the player is
// solving for is exactly the value that's still unknown at render time, so
// it's always rendered as the blank token — describeEquation doesn't leak
// it back out even when the caller happens to already know the answer
// (e.g. for validation). landingX is accepted rather than dropped so a
// caller can special-case display for a fizzled/invalid trajectory later;
// today every case renders the same string.
export function describeEquation() {
  return 'y = x(▢ − x) · s';
}

// Console-runnable assertions. Paste this file's contents into a browser
// console, or just run the dev server — Vite strips this block out of
// production builds since import.meta.env.DEV is statically false there.
if (import.meta.env?.DEV) {
  const isClose = (a, b, epsilon = 1e-6) => Math.abs(a - b) < epsilon;

  const t = makeTrajectory(12);
  console.assert(t.apexX === 6, 'apexX should be landingX / 2', t.apexX);
  console.assert(isClose(t.apexY, 5), 'apexY should be ~= APEX_HEIGHT', t.apexY);
  console.assert(t.yAt(0) === 0, 'yAt(0) should be exactly 0', t.yAt(0));
  console.assert(isClose(t.yAt(12), 0), 'yAt(landingX) should be ~= 0', t.yAt(12));
  console.assert(isClose(t.yAt(6), t.apexY), 'yAt(apexX) should match apexY', t.yAt(6));

  const points = t.sample(50);
  console.assert(points.length === 51, 'sample(50) should return 51 points', points.length);
  console.assert(
    points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    'sample() should never produce NaN/Infinity',
  );
  console.assert(
    points[0].x === 0 && points[points.length - 1].x === 12,
    'sample() should span the full x range',
    points[0],
    points[points.length - 1],
  );

  const zero = makeTrajectory(0);
  const negative = makeTrajectory(-3);
  console.assert(zero.isNull === true, 'makeTrajectory(0) should be a null trajectory');
  console.assert(negative.isNull === true, 'makeTrajectory(-3) should be a null trajectory');
  console.assert(zero.duration === FIZZLE_DURATION, 'null trajectory should use the fizzle duration');

  const farShot = makeTrajectory(20);
  console.assert(
    isClose(farShot.apexY, APEX_HEIGHT),
    'apex height should stay constant regardless of distance',
    farShot.apexY,
  );

  console.log('[trajectory.js] self-test assertions ran — check above for any failures');
}
