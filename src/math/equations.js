// Equation generators for easy and medium difficulty, plus answer
// validation. No DOM, no three.js — pure data so the HUD (session 7) can
// render the blank as a real inline <input> instead of parsing a string.
//
// Every generator picks the answer first, then builds operands around it —
// that's what guarantees the answer always lands in the playable range and
// is always an integer, even for division.

export const PLAYABLE_MIN = 3;
export const PLAYABLE_MAX = 20;

const EASY_OPS = ['+', '-', '×', '÷'];
const MEDIUM_OPS = ['+', '-', '×', '÷'];
const MAX_REROLLS = 10;

function num(value) {
  return { type: 'num', value };
}

function sym(value) {
  return { type: 'op', value };
}

function blank() {
  return { type: 'blank' };
}

// Divisor pairs of n with both factors >= 2, so × never degenerates into a
// trivial "1 × answer" prompt. Empty for primes (and 1) in the playable range.
function factorPairs(n) {
  const pairs = [];
  for (let a = 2; a * a <= n; a += 1) {
    if (n % a === 0) {
      const b = n / a;
      if (b >= 2) pairs.push([a, b]);
    }
  }
  return pairs;
}

// Divisors of n between 2 and 6 — the range ÷'s divisor operand is drawn
// from, so x ÷ b always comes out to an integer.
function divisorsInRange(n, max = 6) {
  const divs = [];
  for (let b = 2; b <= max; b += 1) {
    if (n % b === 0) divs.push(b);
  }
  return divs;
}

function buildEquation({ op, answer, lhs, rhs, blankPosition }) {
  const equation = { op, answer, lhs, rhs, blankPosition };
  equation.prompt = formatPrompt(equation);
  return equation;
}

/**
 * `a op b = ▢` — answer is picked first, operands are built to fit it.
 */
export function makeEasy(rng) {
  const answer = rng.int(PLAYABLE_MIN, PLAYABLE_MAX);
  const pairs = factorPairs(answer);

  let op = rng.pick(EASY_OPS);
  let attempts = 0;
  while (op === '×' && pairs.length === 0 && attempts < MAX_REROLLS) {
    op = rng.pick(EASY_OPS);
    attempts += 1;
  }
  if (op === '×' && pairs.length === 0) op = '+'; // answer has no factor pair (e.g. prime) — fall back

  let a;
  let b;
  if (op === '+') {
    a = rng.int(1, answer - 1);
    b = answer - a;
  } else if (op === '-') {
    b = rng.int(1, 40 - answer); // keeps a = answer + b <= 40
    a = answer + b;
  } else if (op === '×') {
    [a, b] = rng.pick(pairs);
  } else {
    b = rng.int(2, 6);
    a = answer * b;
  }

  return buildEquation({
    op,
    answer,
    lhs: [num(a), sym(op), num(b)],
    rhs: [blank()],
    blankPosition: 'rhs',
  });
}

// Shared by makeMedium and makeMediumSmall — only the answer's range differs.
function generateMedium(rng, min, max) {
  const answer = rng.int(min, max);
  const divs = divisorsInRange(answer);

  let op = rng.pick(MEDIUM_OPS);
  let attempts = 0;
  while (op === '÷' && divs.length === 0 && attempts < MAX_REROLLS) {
    op = rng.pick(MEDIUM_OPS);
    attempts += 1;
  }
  if (op === '÷' && divs.length === 0) op = '+'; // answer has no small divisor — fall back

  let lhs;
  let rhs;
  if (op === '+') {
    const b = rng.int(1, 20);
    lhs = [blank(), sym('+'), num(b)];
    rhs = [num(answer + b)];
  } else if (op === '-') {
    const b = rng.int(1, 20);
    lhs = [blank(), sym('-'), num(b)];
    rhs = [num(answer - b)];
  } else if (op === '×') {
    const coeff = rng.int(2, 9);
    lhs = [num(coeff), sym('×'), blank()];
    rhs = [num(coeff * answer)];
  } else {
    const b = rng.pick(divs);
    lhs = [blank(), sym('÷'), num(b)];
    rhs = [num(answer / b)];
  }

  // Occasionally flip which side the blank sits on (`15 = x + 3`) for
  // texture — the arithmetic itself never changes, just the reading order.
  if (rng.pick([true, false])) {
    [lhs, rhs] = [rhs, lhs];
  }
  const blankPosition = lhs.some((t) => t.type === 'blank') ? 'lhs' : 'rhs';

  return buildEquation({ op, answer, lhs, rhs, blankPosition });
}

/** One-operation "solve for x" equation, answer in the playable range. */
export function makeMedium(rng) {
  return generateMedium(rng, PLAYABLE_MIN, PLAYABLE_MAX);
}

/**
 * Same shape as makeMedium, but the answer is 1-9 — memorable enough for
 * hard mode's three timed equations, and small enough that the final
 * +/- combination of all three stays in the playable range.
 */
export function makeMediumSmall(rng) {
  return generateMedium(rng, 1, 9);
}

/**
 * @param {{ answer: number }} equation
 * @param {string | number} input
 * @returns {{ correct: boolean, parsed: number | null }}
 */
export function checkAnswer(equation, input) {
  if (typeof input !== 'string' && typeof input !== 'number') {
    return { correct: false, parsed: null };
  }
  const raw = String(input).trim();
  if (!/^-?\d+$/.test(raw)) {
    return { correct: false, parsed: null };
  }
  const parsed = Number(raw);
  return { correct: parsed === equation.answer, parsed };
}

/**
 * Renders an equation's tokens back into a display string, e.g. `7 + 5 = ▢`.
 * @param {{ lhs: object[], rhs: object[] }} equation
 * @param {{ blank?: string }} [options]
 */
export function formatPrompt(equation, { blank: blankToken = '▢' } = {}) {
  const renderToken = (t) => (t.type === 'blank' ? blankToken : String(t.value));
  const lhs = equation.lhs.map(renderToken).join(' ');
  const rhs = equation.rhs.map(renderToken).join(' ');
  return `${lhs} = ${rhs}`;
}

if (import.meta.env?.DEV) {
  const { createRng } = await import('../utils/rng.js');

  function checkRange(equations, min, max, label) {
    for (const eq of equations) {
      console.assert(
        Number.isInteger(eq.answer) && eq.answer >= min && eq.answer <= max,
        `${label} answer out of range [${min}, ${max}]`,
        eq,
      );
      for (const token of [...eq.lhs, ...eq.rhs]) {
        if (token.type === 'num') {
          console.assert(Number.isInteger(token.value), `${label} produced a non-integer operand`, eq);
        }
      }
      if (eq.op === '÷') {
        const divisor = eq.lhs.find((t) => t.type === 'num') ?? eq.rhs.find((t) => t.type === 'num');
        console.assert(divisor && divisor.value !== 0, `${label} produced a division by zero`, eq);
      }
    }
  }

  const rng = createRng(42);
  const easy = Array.from({ length: 500 }, () => makeEasy(rng));
  const medium = Array.from({ length: 500 }, () => makeMedium(rng));
  const mediumSmall = Array.from({ length: 500 }, () => makeMediumSmall(rng));

  checkRange(easy, PLAYABLE_MIN, PLAYABLE_MAX, 'makeEasy');
  checkRange(medium, PLAYABLE_MIN, PLAYABLE_MAX, 'makeMedium');
  checkRange(mediumSmall, 1, 9, 'makeMediumSmall');

  const sample = medium[0];
  console.assert(checkAnswer(sample, String(sample.answer)).correct, 'checkAnswer should accept the right value as a string');
  console.assert(checkAnswer(sample, sample.answer).correct, 'checkAnswer should accept the right value as a number');
  console.assert(!checkAnswer(sample, '').correct, 'checkAnswer should reject an empty string');
  console.assert(checkAnswer(sample, '').parsed === null, 'checkAnswer should not parse an empty string');
  console.assert(!checkAnswer(sample, '7.5').correct, 'checkAnswer should reject a decimal');
  console.assert(!checkAnswer(sample, 'abc').correct, 'checkAnswer should reject non-numeric input');
  console.assert(!checkAnswer(sample, sample.answer + 1).correct, 'checkAnswer should reject a wrong integer');

  console.log('[equations.js] self-test assertions ran — check above for any failures');
}
