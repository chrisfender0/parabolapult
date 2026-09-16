// Parses the single linear piece (`ax + b`) the player types into a
// Parabolic-mode blank. No three.js, no DOM — pure string in, {a, b} out.
//
// The grammar is deliberately tiny: an optional leading sign, then terms
// joined by + or -, where each term is `digits`, `digits x`, or `x`. That's
// everything a linear expression needs, and it's also why the keypad in
// session 13.1 can stay small — no `²`, parentheses, `×`, or decimals.

const MAX_COEFFICIENT = 999;

// Normalizes input before tokenizing: the minus sign players might type
// (U+2212, from formatLinear's own output) becomes ASCII '-', whitespace is
// stripped, and 'X' becomes 'x' so case doesn't matter.
function normalize(str) {
  return str.replace(/−/g, '-').replace(/\s+/g, '').toLowerCase();
}

/**
 * @param {string} str
 * @returns {{ a: number, b: number } | null}
 */
export function parseLinear(str) {
  if (typeof str !== 'string') return null;
  const normalized = normalize(str);
  if (normalized === '') return null;

  // Split into signed terms without a regex split-and-lose-the-sign dance:
  // walk the string, and each '+'/'-' (other than a leading sign) starts a
  // new term.
  const termPattern = /[+-]?[^+-]+/g;
  const matches = normalized.match(termPattern);
  if (!matches || matches.join('') !== normalized) return null;

  let a = 0;
  let b = 0;
  for (const raw of matches) {
    let sign = 1;
    let term = raw;
    if (term[0] === '+' || term[0] === '-') {
      sign = term[0] === '-' ? -1 : 1;
      term = term.slice(1);
    }
    if (term === '') return null; // dangling/doubled operator, e.g. "12+-x"

    if (term === 'x') {
      a += sign;
    } else if (/^\d+x$/.test(term)) {
      const coeff = Number(term.slice(0, -1));
      if (coeff > MAX_COEFFICIENT) return null;
      a += sign * coeff;
    } else if (/^\d+$/.test(term)) {
      const value = Number(term);
      if (value > MAX_COEFFICIENT) return null;
      b += sign * value;
    } else {
      return null; // 'xx', 'x2', or any other stray character
    }
  }

  if (Math.abs(a) > MAX_COEFFICIENT || Math.abs(b) > MAX_COEFFICIENT) return null;
  return { a, b };
}

function formatXTerm(a) {
  const abs = Math.abs(a);
  const coeff = abs === 1 ? '' : String(abs);
  return `${coeff}x`;
}

/**
 * Renders `{a, b}` back into a display string, e.g. `12 − x`, `x − 6`, `12x`.
 * Uses U+2212 for the minus sign, matching the rest of the HUD's typography.
 * Positive terms are listed before negative ones (`12 − x`, not `−x + 12`),
 * which is what makes the factored-form example in the plan read naturally.
 * @param {{ a: number, b: number }} linear
 */
export function formatLinear({ a, b }) {
  const terms = [];
  if (a !== 0) terms.push({ value: a, text: formatXTerm(a) });
  if (b !== 0) terms.push({ value: b, text: String(Math.abs(b)) });
  if (terms.length === 0) return '0';

  const ordered = [...terms.filter((t) => t.value > 0), ...terms.filter((t) => t.value < 0)];
  let out = '';
  ordered.forEach((term, i) => {
    if (i === 0) {
      out += term.value < 0 ? `−${term.text}` : term.text;
    } else {
      out += term.value < 0 ? ` − ${term.text}` : ` + ${term.text}`;
    }
  });
  return out;
}

if (import.meta.env?.DEV) {
  const cases = [
    ['12 - x', { a: -1, b: 12 }],
    ['12-x', { a: -1, b: 12 }],
    ['-x+12', { a: -1, b: 12 }],
    ['−2x + 24', { a: -2, b: 24 }],
    ['12x', { a: 12, b: 0 }],
    ['x - 6', { a: 1, b: -6 }],
    ['x', { a: 1, b: 0 }],
    ['-x', { a: -1, b: 0 }],
    ['0', { a: 0, b: 0 }],
    ['x + x + 3', { a: 2, b: 3 }],
    ['x - x', { a: 0, b: 0 }],
    ['+x+3', { a: 1, b: 3 }],
    ['3 + x', { a: 1, b: 3 }],
    ['-3-x', { a: -1, b: -3 }],
    ['999x', { a: 999, b: 0 }],
    ['999', { a: 0, b: 999 }],
  ];
  for (const [input, expected] of cases) {
    const result = parseLinear(input);
    console.assert(
      result && result.a === expected.a && result.b === expected.b,
      `parseLinear(${JSON.stringify(input)}) should be ${JSON.stringify(expected)}`,
      result,
    );
  }

  const invalid = [
    '', '   ', '12-', '12+-x', 'xx', 'x2', '2xx', 'abc', '1.5x', '1.5',
    'x++3', '--x', 'x-', '+', '-', '1000x', '1000', 'x*2', '2*x', '(x)',
  ];
  for (const input of invalid) {
    console.assert(parseLinear(input) === null, `parseLinear(${JSON.stringify(input)}) should be null`, parseLinear(input));
  }

  const roundTrip = [
    { a: -1, b: 12 },
    { a: 1, b: -6 },
    { a: 12, b: 0 },
    { a: -2, b: 24 },
    { a: 1, b: 0 },
    { a: -1, b: 0 },
    { a: 0, b: 0 },
  ];
  for (const linear of roundTrip) {
    const formatted = formatLinear(linear);
    const reparsed = parseLinear(formatted);
    console.assert(
      reparsed && reparsed.a === linear.a && reparsed.b === linear.b,
      `formatLinear(${JSON.stringify(linear)}) -> ${JSON.stringify(formatted)} should re-parse to the same values`,
      reparsed,
    );
  }

  console.log('[linearExpr.js] self-test assertions ran — check above for any failures');
}
