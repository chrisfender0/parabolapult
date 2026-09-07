# Session 9 — Scoring and Results

## Goal

A score model worth chasing, a results screen at the end of a game, and leaderboard persistence.

## Depends on

Sessions 6, 7, 8.

## Design notes

A "game" is a run of several rounds (start with 5). Each round is one equation with up to 3 tries. The run ends when the rounds are exhausted, or immediately when a round is lost — pick **rounds exhausted, losses simply score zero for that round**, so a single bad round doesn't end the session. Note the alternative in the file so it can be flipped later.

## Tasks

- `src/game/scoring.js`:
  - Base per round: `100` for a hit.
  - Try bonus: `+50` if hit on the first try, `+20` on the second, `0` on the third.
  - Difficulty multiplier: easy `×1`, medium `×1.5`, hard `×2.5`.
  - Hard-mode speed bonus hook (implemented in session 10): `+` up to `60` based on time left across the three timed equations. Stub it as `0` for now.
  - Streak: consecutive first-try hits add a stacking `+25`, reset on any miss.
  - `scoreRound({ hit, tryIndex, difficulty, streak, speedBonus })` → `{ points, breakdown }` so the results screen can itemize.
- Round counter and streak tracked on `GameSession`; `GameController` emits `round:scored` with the breakdown.
- HUD shows running score and round `n / 5`.
- `src/ui/screens/Result.js`: final score with a count-up animation, per-round breakdown table (equation, your answer, target, tries used, points), leaderboard placement callout if it made the top 10, and Play Again / Back to Landing buttons. Writes the entry via `leaderboard.addEntry` exactly once.

## Files touched

`src/game/scoring.js`, `src/ui/screens/Result.js` (new); `src/game/GameController.js`, `src/game/GameSession.js`, `src/ui/hud.js`, `src/storage/leaderboard.js` (edit).

## Done when

A full 5-round easy game ends on the results screen with a correct itemized breakdown, the score appears on the landing leaderboard, replaying doesn't double-write the entry, and difficulty multipliers visibly change the totals.

## Ask Chris to

Play one full game per difficulty (hard will be incomplete until session 10) and say whether the scoring feels fair and whether 5 rounds is the right length.
