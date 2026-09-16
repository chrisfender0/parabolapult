# Manual Test Checklist

Run before any release. Last run: **2026-09-15**, against `main` post-session-11,
locally via `npm run dev` (Chromium, automated browser pane) plus a
production build/preview pass. Two real bugs were found and fixed during
this pass — see the note under "Target reveal" below.

Use `window.__enableDebug()` in the console (then reload) to expose
`window.__game` / `projectile` / `target` and the target's marker number,
which makes driving through rounds programmatically for regression testing
much faster. `window.__disableDebug()` turns it back off. Always do a final
pass with debug **off**, since it changes visible behavior (target marker
label, always-visible container).

## Core loop, each difficulty

- [x] **Easy** — full 5-round game, first-try hits throughout, correct
      score math (base + try bonus + streak bonus, ×1 multiplier), lands on
      Results with a leaderboard write.
- [x] **Medium** — spot-checked equation generation (blank on either side,
      all four operators), one full game to Results.
- [x] **Hard** — full flow: three timed mini-equations → recall → solve →
      launch, first-try hit scores with speed bonus, ×2.5 multiplier.

## Tries / round outcomes

- [x] 3 tries burn correctly; pips update after each miss.
- [x] Round loss path (3 wrong tries) shows "Out of tries" with the
      landed-at/target-was reveal, `Continue` advances to the next round.
- [x] Game over path (5th round concluded, win or loss) fires `game:over`
      and renders Results with a full per-round breakdown.

## Hard mode specifics

- [x] A wrong answer on one of the three timed equations fails the whole
      attempt, burns a try, and **replays the same three equations** from
      the top (not new ones).
- [x] **Timer expiry with a blank input**: happened naturally during this
      pass (a mini-equation's 15s countdown ran out with nothing typed) —
      auto-submitted the blank, correctly failed the attempt, and (with no
      tries left) ended the round as a loss with the right equation flagged
      as the one that broke it.
- [x] A wrong final (recall + solve) answer replays **only the final
      phase** — the three mini-equations are not replayed, `hardSequence`
      stays completed/untouched.
- [x] Results screen reveal: recalled vs. true values per equation (color
      chips), typed vs. correct combined result; a round lost before the
      final phase instead shows which equation failed and the full
      last-attempt breakdown.

## Target reveal (bug found and fixed this pass)

- [x] The target container must **not** reveal on a miss that still has
      tries remaining — it should only appear on a hit, or on the miss
      that ends the round. Found broken during this pass: `target.reveal()`
      was unconditional on every `try:miss`, showing the answer after the
      very first miss. Its ambient glow was also hardcoded to the
      hit-green color, so a revealed miss looked like a success. Both
      fixed in `src/ui/screens/Game.js` and `src/world/target.js` — see
      the "Stop revealing the target on a miss with tries left" commit.
      Re-verified: hidden through retries, reveals (neutral accent glow)
      only on the deciding hit/loss.

## Leaderboard / storage

- [x] Writes exactly once per completed game, sorts by score descending,
      caps at 20 entries.
- [x] Survives a full page reload (`localStorage`-backed).
- [x] **Reset Data**: confirmation step, then clears leaderboard, last
      name, and debug flag (every `parabolapult:*` key) and the button
      disappears (nothing left to reset).

## Viewports

- [x] 390×844 (portrait phone) — ruler fully visible edge to edge, HUD
      compact at the bottom, doesn't cover the target.
- [x] 768×1024 (tablet) — same, more vertical breathing room.
- [x] 1440×900 (desktop) — same.
- [~] 1920×1080 / 2560×1080 (very wide) — verified via DOM
      `getBoundingClientRect()` and WebGL `drawingBuffer` size checks that
      layout and the render target are correct at these sizes (canvas and
      camera frustum both scale properly). **Could not visually confirm
      via screenshot** — this specific browser-automation pane fails to
      capture screenshots correctly above roughly 1440px wide (content
      renders correctly per the DOM/GL checks, but the screenshot itself
      comes back blank or misleadingly cropped). Worth a real-monitor
      spot check.
- [ ] Soft keyboard on iOS Safari / Android Chrome not hiding the
      equation — **not testable from this environment** (no real mobile
      device/simulator attached). Ask Chris to check on a real phone.

## Bad input (equation answer field)

- [x] Empty submit — no-op, no try consumed.
- [x] Negative number (`-5`) — blocked by the input's native
      `pattern="[0-9]*"` validation before it reaches the app.
- [x] Decimal (`7.5`) — rejected (native pattern, and `checkAnswer`'s
      `^-?\d+$` regex as a second line of defense).
- [x] Huge number (21 digits) — accepted as a number, launches a real
      (if absurd) trajectory, resolves as a clean miss. No crash, no
      console error. Feedback text renders fine in scientific notation.
- [x] Pasted/typed non-numeric text (`abc`) — blocked by native pattern
      validation, no launch.

## Backgrounding

- [x] Tabbing away mid-flight and coming back: confirmed indirectly
      throughout this session — `core/loop.js`'s `MAX_DELTA` clamp caps
      each frame's delta at 0.05s regardless of how long the tab was
      backgrounded, so play never fast-forwards on return. (The same
      clamp is why heavily-throttled automated frames made some of this
      session's manual testing slow — expected, not a bug.)
- [~] Mid-hard-timer backgrounding specifically: not separately isolated,
      but the same `update(dt)` clamp path covers it (`HardSequence.update`
      is driven by the identical main-loop `dt`).

## Production build

- [x] `npm run build && npm run preview`, loaded at
      `http://localhost:4173/parabolapult/`: no console errors, no 404s
      (checked full network log — every asset resolved under the
      `/parabolapult/` base), played a Medium round through cleanly.

## Parabolic mode (session 13.1)

Run against the same build as the rest of this pass, driven through the
automated browser pane plus `window.__game.submitParabolic()` for fast
regression loops (see the debug-mode note at the top of this file).

- [x] **Target visibility** (bug found and fixed after this pass's first
      round-trip) — Chris flagged that a fresh Parabolic round showed no
      target at all: `target.hide()` (the same hide-until-landed behavior
      Classic uses) left the container invisible, but Parabolic's blank
      needs the target's actual number to build, unlike Classic where the
      equation alone determines the answer. Fixed in
      `src/ui/screens/Game.js`'s `round:begin` handler — Parabolic now
      calls `target.reveal()` instead of `target.hide()`. Re-verified with
      debug mode **off**: the container is visible on the ruler from the
      start of every Parabolic round; Classic still hides it as before.
- [x] **Setup screen** — mode toggle switches card descriptions between
      Classic's and Parabolic's (factored/standard/vertex wording); last
      selected mode is remembered across a reload.
- [x] **Easy, full game** — typed `12 − x` (and other algebraically
      equivalent forms) for a target of 12 correctly hits; 5-round game
      reaches Results with the Parabolic ×1.5 multiplier applied.
- [x] **Invalid input** (`xx`) — shows "Can't read that. Try something like
      12 − x", does **not** spend a try (pips unchanged), typed text stays
      in the blank for correction.
- [x] **Dive miss** (`x − 3` against a factored-form target, opens upward)
      — shows "Opens upward. Straight into the ground.", burns a try, crash
      particles play at the pad, and the previously-typed text is kept
      (not cleared) for the retry.
- [x] **Classic-mode regression** — Easy and Hard both replayed after the
      mode/generator-table changes in `GameController`; hard mode's
      timed memorization → recall → solve flow is unaffected (confirms the
      `isClassicHard()` guard replaced every `difficulty === 'hard'` check
      correctly, including the two inside `submitHardRecall`/
      `submitHardFinal` that would otherwise have accepted Parabolic Hard).
- [x] **Results screen reveal** — each round shows `you: <typed>` next to
      a ✓/✗ icon and the canonical solution, matching the hard-mode
      reveal's style.
- [x] **Leaderboard** — a Parabolic entry displays as `Parabolic · Easy`;
      pre-existing entries with no `mode` field still display correctly as
      their plain difficulty label (`Hard`).
- [x] **390×844 viewport** — ruler, target marker, full equation (template
      + blank), and keypad all visible at once with no overlap; verified
      via the browser pane's mobile emulation (375×812, iPhone-class).
- [ ] Real phone keypad feel, Hard (vertex form) difficulty jump, and
      whether the Parabolic scoring multipliers feel fair vs. Classic —
      **not testable from this environment**. Ask Chris (see
      plan/13.1-parabolic-play.md's "Ask Chris to").

## Known gaps

See [KNOWN-ISSUES.md](KNOWN-ISSUES.md).
