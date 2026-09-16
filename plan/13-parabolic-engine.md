# Session 13 — Parabolic Mode: The Math Engine

## Goal

The pure-math core of a second game mode, **Parabolic**. In this mode the
player doesn't type a number. They type one linear piece (`ax + b`) into a
blank inside a parabola template, and where the projectile lands depends on
the equation they built. This session covers only the pure math: parsing
that input, generating the equations, and turning a parsed input into a
flight result. It has no UI and no three.js.

## Depends on

Sessions 3 (trajectory math) and 5 (equation engine, seeded RNG).

## Design notes

### Mode × difficulty

Parabolic is a separate **mode**. The existing game becomes the **Classic**
mode. Within Parabolic, the player picks one difficulty, and all 5 rounds
use that difficulty. Parabolic mode has no memorization or timer phase.

| Difficulty | Form     | Template shown        | Example (target 12) | Answer range      |
|------------|----------|-----------------------|---------------------|-------------------|
| Easy       | factored | `y = x · ( ▢ )`       | `12 − x`            | 3–20              |
| Medium     | standard | `y = −x² + ▢`         | `12x`               | 3–20              |
| Hard       | vertex   | `y = −( ▢ )² + c`     | `x − 6`, c = 36     | **even** 4–20     |

For Hard, `c = (A/2)²`. Limiting answers to even numbers keeps the vertex on
a whole number. Answers are still picked first and the template is built from
them, which follows the existing design rule.

### The blank is always linear

Every template takes an `ax + b` with integer `a` and `b`. The parser never
needs to handle `²`, parentheses, `×`, or decimals, which is also why the
keypad in session 13.1 can stay small.

### Grading: math, not strings, and never rounded

Plug the parsed `{a, b}` into the template, expand it to `y = p·x² + q·x + r`,
and grade using only whole-number arithmetic:

| Form     | p      | q       | r        |
|----------|--------|---------|----------|
| factored | `a`    | `b`     | `0`      |
| standard | `−1`   | `a`     | `b`      |
| vertex   | `−a²`  | `−2ab`  | `c − b²` |

**Hit ⇔ `r === 0 && p < 0 && q === −p · A`.** In words: the parabola opens
downward, passes through the launcher (x = 0), and its other root is exactly
the target. This means `12−x`, `-x+12`, `−2x+24` (Easy), and `6−x` (Hard) all
count as correct, because each is a real parabola from 0 to 12. `2x − 18` on
Hard is a miss: its roots are 6 and 12, so it doesn't pass through the
launcher.

⚠️ **Don't use `flightOutcome.resolveOutcome` for this mode.** It runs
`Math.round(landingX)`, so on Easy `−2x + 23` would land at 11.5, round to 12,
and wrongly count as a hit. Parabolic mode decides the outcome from the
coefficient check above. The flight only animates that result.

### Where a wrong answer flies

`resolveParabolicFlight(p, q, r)` returns a flight descriptor:

| Case | Kind | What the player sees |
|---|---|---|
| hit (the check above) | `arc`, landingX = A | Normal arc into the container |
| `p > 0` (opens upward) | `dive` | Projectile nose-dives into the ground just past the launcher |
| `p === 0`, `q > 0` (straight line going up) | `orbit` | Climbs straight out of frame and never comes down |
| `p === 0`, otherwise | `fizzle` | Existing null trajectory |
| `p < 0`, no real roots, or largest root ≤ 0 | `fizzle` | Existing null trajectory |
| `p < 0`, largest root in (0, 24] | `arc`, landingX = largest root (may be a decimal) | Normal-height arc to the wrong spot |
| `p < 0`, largest root > 24 | `overshoot` | Arc leaves the right edge past the end of the ruler |

The largest root is `(−q − √(q² − 4pr)) / (2p)` when `p < 0`. Also return
`landedAt` (rounded to 1 decimal, for display only) so the HUD can say
"landed at 11.5".

**Known compromise, documented on purpose:** every `arc` flight uses the
existing fixed-height `makeTrajectory(landingX)`. That means (a) the arc on
screen is scaled vertically compared to the real equation (`−x² + 12x` peaks
at 36), and (b) a wrong Hard answer like `x − 5` has y(0) = 11, but the
projectile still launches from the pad. Landing position is the only thing
the flight shows exactly. Add a note about this to `docs/KNOWN-ISSUES.md`.

## Tasks

- `src/math/linearExpr.js` (new): `parseLinear(str)` → `{ a, b }` or `null`.
  - Before parsing: map `−` (U+2212) to `-`, strip whitespace, lowercase `X`.
  - Grammar: an optional leading sign, then terms joined by `+`/`-`. Each
    term is `digits`, `digits x`, or `x`. Combine like terms, so `x + x + 3`
    becomes `{a: 2, b: 3}`.
  - Return `null` for: empty input, a dangling or doubled operator (`12-`,
    `12+-x`), `xx`, `x2`, any other character, or coefficients above 999.
  - `formatLinear({a, b})` → the display form (`12 − x`, `x − 6`, `12x`) for
    the results screen.
- `src/math/parabolic.js` (new):
  - `makeParabolicEasy(rng)`, `makeParabolicMedium(rng)`,
    `makeParabolicHard(rng)` → `{ form, answer, c?, template, solution }`.
    `template` is `{ before, after }` strings around the blank, for example
    `{ before: 'y = −(', after: ')² + 36' }`. `solution` is the canonical
    `{a, b}` used in the reveal.
  - `expand(form, {a, b}, c)` → `{ p, q, r }`.
  - `gradeParabolic(equation, parsed)` → `{ hit, flight }`, using the check
    and the flight table above.
  - Avoid repeating the same answer in back-to-back rounds, the same way
    session 5's generators do, if they do.
- `src/math/trajectory.js`: add `makeDiveTrajectory()`,
  `makeOrbitTrajectory()`, and `makeOvershootTrajectory(landingX)`. They
  return the same shape as `makeTrajectory` (`yAt`, `pointAt`, `sample`,
  `duration`), plus a `kind` field. The flight code in session 13.1 must not
  need special cases for them.
  - dive: a short hop up that curves down below y = 0 by about x = 1.5.
  - orbit: rises steeply off the top of the frame in about 1.2s.
  - overshoot: a normal arc toward `landingX`, but the animation ends when x
    passes 24 plus a small margin.
- Add a `import.meta.env.DEV` assertion block in each new file, matching
  `trajectory.js`:
  - Parser: at least 25 cases, both valid and invalid, including all the
    inputs named in this plan.
  - For each difficulty over 500 seeds: `answer` is in range (even on Hard),
    grading `solution` is a hit, and `landedAt === answer`.
  - The false-hit case: `−2x + 23` on Easy with target 12 is a **miss** that
    lands at 11.5.
  - One case per row of the flight table.
- `plan/00-PLAN.md` already lists 13 and 13.1 (added in the commit that
  introduced these plans). Update it only if this session changes the plan.

## Files touched

`src/math/linearExpr.js`, `src/math/parabolic.js` (new);
`src/math/trajectory.js`, `docs/KNOWN-ISSUES.md` (edit).

## Done when

The dev server's console shows no failed assertions. All three generators
pass the 500-seed checks, the parser handles every case listed here, and each
row of the flight table has a passing assertion. Classic mode still plays
exactly as before, since nothing in `src/game` or `src/ui` has changed yet.

## Ask Chris to

Nothing to play-test yet. Review the flight table. If `−2x + 24` counting as
correct on Easy (a steeper parabola that still lands at 12) feels wrong,
now is the time to change the rule to "must match `12 − x` exactly".
