# Session 6 — Game Controller

## Goal

The state machine that runs a round: generate an equation, place the target, take an answer, launch, resolve the outcome, spend a try, and end the round. No UI in this session — it's driven by events and console calls.

## Depends on

Sessions 2, 3, 4, 5.

## Design notes

Three tries per round. The equation and the target position stay **the same** across the three tries — the player is retrying the same problem, not getting a new one. (Hard mode overrides this in session 10.1: retries replay only the final equation.)

## Tasks

- `src/game/GameSession.js`: plain data for one playthrough — `difficulty`, `playerName`, `round`, `score`, `triesRemaining`, `history[]`. No behavior beyond simple accessors.
- `src/game/GameController.js` (extends/uses `Emitter`):
  - `start({ difficulty, playerName })`.
  - `beginRound()` — asks the equation engine for a problem based on difficulty, sets `target.setMarker(answer)`, resets tries to 3, emits `round:begin` with the equation and target marker.
  - `submit(input)` — validates via `checkAnswer`, builds a trajectory from the **entered number** (not the correct one — a wrong number must visibly fly to the wrong place), launches the projectile, and locks input until the flight resolves.
  - On flight resolution: emit `try:hit` or `try:miss` with `{ landedAt, targetAt, triesRemaining }`. On a miss, decrement tries; at zero emit `round:lost`. On a hit, emit `round:won`.
  - `nextRound()` / `endGame()` — emits `game:over` with the final session for the results screen.
  - Guard rails: ignore `submit` while a flight is in the air or the round is over.
- Wire into `main.js` behind console hooks: `window.__game.start({difficulty:'easy'})`, `window.__game.submit('12')`.

## Files touched

`src/game/GameSession.js`, `src/game/GameController.js` (new); `src/main.js` (edit).

## Done when

From the console, starting an easy game logs an equation and places the target on its answer; submitting the right number produces a hit and `round:won`; three wrong numbers in a row produce three visible crashes and `round:lost`; submitting during a flight is a no-op.
