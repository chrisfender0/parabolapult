# Session 5 — Equation Engine

## Goal

Generators that produce easy and medium equations whose answers are always valid landing distances, plus validation. Pure logic, no DOM, no three.js.

## Depends on

Nothing (consumed by session 6).

## Design notes

Every generated equation's answer must be an integer in the **playable range** — start with 3 to 20 inclusive, so the target always sits on a labeled part of the ruler and short shots stay readable. Generators retry (or construct backwards from a chosen answer) rather than filtering blindly.

The cleanest approach is to **pick the answer first**, then build an equation around it. That guarantees range and integrality for every operator including division.

## Tasks

- `src/utils/rng.js`: seedable RNG (mulberry32 or similar) with `int(min, max)` and `pick(array)`. Seeding keeps bugs reproducible.
- `src/math/equations.js` exporting:
  - `PLAYABLE_MIN = 3`, `PLAYABLE_MAX = 20`.
  - `makeEasy(rng)` → `{ prompt, answer, op }`. Pick `answer` in range, pick an operator, build operands:
    - `+`: `a + b = ▢` with `a + b === answer`
    - `−`: `a − b = ▢` with `a − b === answer`, `a` kept ≤ 40
    - `×`: `a × b = ▢` only when `answer` has a usable factor pair (else re-roll the operator)
    - `÷`: `(answer × b) ÷ b = ▢` with `b` in 2–6
  - `makeMedium(rng)` → `{ prompt, answer, op }` where the unknown is `x` and the answer is what `x` equals: `x + 3 = 15`, `x − 4 = 8`, `3x = 21`, `x ÷ 2 = 6`. Same range guarantee. Vary which side `x` sits on occasionally (`15 = x + 3`) for texture, but never require reordering that changes the arithmetic difficulty.
  - `makeMediumSmall(rng)` → same as `makeMedium` but with answers constrained to 1–9. Hard mode's three memorized values use this so they're actually memorable and so the final `+`/`−` expression stays in the playable range.
  - `checkAnswer(equation, input)` → `{ correct: boolean, parsed: number | null }`; rejects non-integers and blanks.
  - `formatPrompt(equation, { blank = '▢' })` → the display string, with the blank token the HUD can style.
- Keep the prompt data structured (`{ lhs, op, rhs, blankPosition }`) as well as pre-formatted, so the HUD can render the blank as a real `<input>` inline rather than parsing a string.

## Files touched

`src/utils/rng.js`, `src/math/equations.js` (new).

## Done when

Generating 500 of each type with a seeded RNG produces zero answers outside the declared range, zero non-integer answers, zero division-by-zero, and every `makeMediumSmall` answer in 1–9. `checkAnswer` correctly rejects `""`, `"7.5"`, and `"abc"`.
