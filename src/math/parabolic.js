// Parabolic-mode math: equation generators, expansion into standard-form
// coefficients, and grading. No three.js, no DOM — see linearExpr.js and
// plan/13-parabolic-engine.md for the design this implements.
//
// A round hands the player a template built around a hidden linear blank
// `ax + b`. Depending on the difficulty, that blank sits inside a factored,
// standard, or vertex-form parabola. Expanding whatever the player actually
// typed into `p·x² + q·x + r` and checking those coefficients (rather than
// comparing distances) is what makes every algebraically-equivalent correct
// answer count as a hit, and lets a wrong answer be graded exactly even when
// it doesn't correspond to a whole-number landing spot.

import { PLAYABLE_MIN, PLAYABLE_MAX } from './equations.js';

const RULER_END = 24;

/**
 * Expand a template + the player's `{a, b}` into `y = p·x² + q·x + r`.
 * @param {'factored' | 'standard' | 'vertex'} form
 * @param {{ a: number, b: number }} linear
 * @param {number} [c] - only used by the vertex form.
 */
export function expand(form, { a, b }, c) {
  if (form === 'factored') return { p: a, q: b, r: 0 };
  if (form === 'standard') return { p: -1, q: a, r: b };
  if (form === 'vertex') return { p: -(a * a), q: -2 * a * b, r: c - b * b };
  throw new Error(`Unknown parabolic form: ${form}`);
}

/**
 * Where a flight with the given standard-form coefficients ends up. Mirrors
 * the flight table in plan/13-parabolic-engine.md. Doesn't need the target
 * distance: a genuine hit's coefficients already put the largest root
 * exactly at the target (see the DEV assertions below), so this function
 * only ever needs p/q/r.
 */
export function resolveParabolicFlight(p, q, r) {
  if (p > 0) return { kind: 'dive', landingX: null, landedAt: null };
  if (p === 0) {
    if (q > 0) return { kind: 'orbit', landingX: null, landedAt: null };
    return { kind: 'fizzle', landingX: null, landedAt: null };
  }

  const discriminant = q * q - 4 * p * r;
  if (discriminant < 0) return { kind: 'fizzle', landingX: null, landedAt: null };

  const root = (-q - Math.sqrt(discriminant)) / (2 * p);
  if (!Number.isFinite(root) || root <= 0) return { kind: 'fizzle', landingX: null, landedAt: null };

  const landedAt = Math.round(root * 10) / 10;
  if (root <= RULER_END) return { kind: 'arc', landingX: root, landedAt };
  return { kind: 'overshoot', landingX: root, landedAt };
}

/**
 * @param {{ form: string, answer: number, c?: number }} equation
 * @param {{ a: number, b: number }} parsed
 * @returns {{ hit: boolean, flight: ReturnType<typeof resolveParabolicFlight> }}
 */
export function gradeParabolic(equation, parsed) {
  const { p, q, r } = expand(equation.form, parsed, equation.c);
  const hit = r === 0 && p < 0 && q === -p * equation.answer;
  const flight = resolveParabolicFlight(p, q, r);
  return { hit, flight };
}

/** `y = x · ( ▢ )`, e.g. target 12 → `12 − x`. */
export function makeParabolicEasy(rng) {
  const answer = rng.int(PLAYABLE_MIN, PLAYABLE_MAX);
  return {
    form: 'factored',
    answer,
    template: { before: 'y = x · ( ', after: ' )' },
    solution: { a: -1, b: answer },
  };
}

/** `y = −x² + ▢`, e.g. target 12 → `12x`. */
export function makeParabolicMedium(rng) {
  const answer = rng.int(PLAYABLE_MIN, PLAYABLE_MAX);
  return {
    form: 'standard',
    answer,
    template: { before: 'y = −x² + ', after: '' },
    solution: { a: answer, b: 0 },
  };
}

/** `y = −( ▢ )² + c`, e.g. target 12 → `x − 6`, c = 36. Target is always even. */
export function makeParabolicHard(rng) {
  const answer = rng.int(2, 10) * 2; // even, 4-20
  const c = (answer / 2) ** 2;
  return {
    form: 'vertex',
    answer,
    c,
    template: { before: 'y = −( ', after: ` )² + ${c}` },
    solution: { a: 1, b: -answer / 2 },
  };
}

if (import.meta.env?.DEV) {
  const { createRng } = await import('../utils/rng.js');

  function checkGenerator(makeFn, label, { min = PLAYABLE_MIN, max = PLAYABLE_MAX, mustBeEven = false } = {}) {
    const rng = createRng(42);
    for (let i = 0; i < 500; i += 1) {
      const equation = makeFn(rng);
      console.assert(
        Number.isInteger(equation.answer) && equation.answer >= min && equation.answer <= max,
        `${label} answer out of range [${min}, ${max}]`,
        equation,
      );
      if (mustBeEven) {
        console.assert(equation.answer % 2 === 0, `${label} answer should be even`, equation);
      }
      const { hit, flight } = gradeParabolic(equation, equation.solution);
      console.assert(hit === true, `${label} solution should grade as a hit`, equation);
      console.assert(
        flight.landedAt === equation.answer,
        `${label} solution should land exactly on the target`,
        equation,
        flight,
      );
    }
  }

  checkGenerator(makeParabolicEasy, 'makeParabolicEasy');
  checkGenerator(makeParabolicMedium, 'makeParabolicMedium');
  checkGenerator(makeParabolicHard, 'makeParabolicHard', { min: 4, max: 20, mustBeEven: true });

  // The false-hit case named in the plan: a steeper-looking factored answer
  // that still isn't the target's real other root.
  {
    const equation = { form: 'factored', answer: 12 };
    const { hit, flight } = gradeParabolic(equation, { a: -2, b: 23 });
    console.assert(hit === false, '-2x + 23 should be a miss for target 12', flight);
    console.assert(flight.landedAt === 11.5, '-2x + 23 should land at 11.5', flight);
  }

  // One case per row of the flight table.
  {
    const dive = resolveParabolicFlight(1, 2, 3); // p > 0
    console.assert(dive.kind === 'dive', 'p > 0 should dive', dive);

    const orbit = resolveParabolicFlight(0, 5, 1); // p === 0, q > 0
    console.assert(orbit.kind === 'orbit', 'p === 0, q > 0 should orbit', orbit);

    const fizzleFlat = resolveParabolicFlight(0, -5, 1); // p === 0, q <= 0
    console.assert(fizzleFlat.kind === 'fizzle', 'p === 0, q <= 0 should fizzle', fizzleFlat);

    const fizzleNoRoots = resolveParabolicFlight(-1, 0, -5); // p < 0, discriminant < 0
    console.assert(fizzleNoRoots.kind === 'fizzle', 'p < 0 with no real roots should fizzle', fizzleNoRoots);

    const fizzleNegativeRoot = resolveParabolicFlight(-1, -3, -2); // p < 0, largest root <= 0
    console.assert(fizzleNegativeRoot.kind === 'fizzle', 'p < 0 with largest root <= 0 should fizzle', fizzleNegativeRoot);

    const arc = resolveParabolicFlight(-1, 10, 0); // p < 0, largest root in (0, 24]
    console.assert(arc.kind === 'arc' && arc.landedAt === 10, 'p < 0 with a root in range should arc', arc);

    const overshoot = resolveParabolicFlight(-1, 30, 0); // p < 0, largest root > 24
    console.assert(overshoot.kind === 'overshoot' && overshoot.landedAt === 30, 'p < 0 with a root past 24 should overshoot', overshoot);
  }

  console.log('[parabolic.js] self-test assertions ran — check above for any failures');
}
