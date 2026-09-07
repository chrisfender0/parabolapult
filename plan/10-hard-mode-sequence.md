# Session 10 — Hard Mode: The Timed Memory Sequence

## Goal

The first half of hard mode: three timed, color-coded medium equations presented one at a time, with **no correctness feedback**, whose answers the player must memorize.

## Depends on

Sessions 5, 6, 7.

## Design notes

Colors are the memory aid and the link to the final equation. Use three that stay distinguishable for colorblind players and are also given a shape/label backup (a small ①②③ badge in the matching color), never color alone:

- Equation 1 — **amber** (`--hm-1`)
- Equation 2 — **cyan** (`--hm-2`)
- Equation 3 — **magenta** (`--hm-3`)

Each equation uses `makeMediumSmall` (answers 1–9) so they're memorable and so the final `+`/`−` expression lands in the playable range.

Timer: 15 seconds per equation, shown as a depleting bar in that equation's color. Running out submits whatever is typed (including blank) and moves on — same as answering. The player is never told if they were right.

## Tasks

- `src/game/HardSequence.js`:
  - Generates three `makeMediumSmall` equations, assigns colors 1–3 in order.
  - Runs them sequentially: `current`, `advance()`, per-equation countdown driven from the main loop's `dt` (not `setInterval` — keeps it consistent with the render loop and survives tab-switches via the clamped delta).
  - Records `{ equation, playerAnswer, correctAnswer, timeLeft }` per step privately; emits only `hard:step` (index + color + prompt) and `hard:sequenceComplete`. Nothing in the emitted payload reveals correctness.
  - Accumulates `timeLeftTotal` for session 9's speed bonus.
- `src/ui/hud.js` additions: a hard-mode step panel — the equation with its inline blank, a thick colored border in the step color, the ①②③ badge, and the countdown bar. A brief neutral "Locked in" transition between steps (no green/red, no reveal).
- `GameController.beginRound()` branches on `difficulty === 'hard'` to run the sequence first, then hands off to session 10.1's final equation.
- The 3D world stays visible and idle behind the sequence — no launching happens during this phase.

## Files touched

`src/game/HardSequence.js` (new); `src/ui/hud.js`, `src/game/GameController.js`, `src/style.css` (edit).

## Done when

Starting a hard game shows three colored, badged, timed equations in sequence; letting a timer expire advances without comment; at no point does the UI hint at correctness; the console shows the recorded answers and total time left after `hard:sequenceComplete`.

## Ask Chris to

Run the sequence a couple of times and say whether 15 seconds is right, and whether three values are memorable enough or whether the badges/colors need to be louder.
