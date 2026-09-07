# Session 12 — Testing, README, Release

## Goal

Confidence that it works everywhere it needs to, and documentation good enough to come back to in six months.

## Depends on

Everything.

## Tasks

- **Manual test checklist** at `docs/TEST-CHECKLIST.md`, run and recorded:
  - Each difficulty, full 5-round game, start to results.
  - 3 tries burn correctly; round loss path; game over path.
  - Hard mode: timer expiry with a blank input, retry replaying only the final equation, results reveal correctness.
  - Leaderboard writes once, sorts correctly, survives reload, resets cleanly.
  - Viewports: 390×844 portrait, 768×1024, 1440×900, and a very wide window — ruler always fully visible, equation panel never covers the target.
  - Soft keyboard on iOS Safari and Android Chrome doesn't hide the equation.
  - Bad input: empty, negative, decimal, huge number, pasted text.
  - Tab away mid-flight and mid-hard-timer, come back — nothing breaks or fast-forwards wildly.
- Fix whatever the checklist turns up (or file it in `docs/KNOWN-ISSUES.md` if out of scope).
- **README.md**: what the game is, the live link, the core mechanic in three sentences, difficulty descriptions, `npm run dev` / `build` / `preview`, deploy notes (Actions → Pages, the `base` path gotcha), and a pointer to `plan/` explaining the session-per-file convention.
- Production build check: `npm run build && npm run preview`, confirm no console errors and no 404s under the `/parabolapult/` base.
- Final push, confirm the Actions run is green and the live site matches local.

## Files touched

`README.md`, `docs/TEST-CHECKLIST.md`, `docs/KNOWN-ISSUES.md` (new); bug fixes wherever they land.

## Ask Chris to

Run the checklist on a real iPhone and a real desktop browser and report anything that differs from the local dev experience.
