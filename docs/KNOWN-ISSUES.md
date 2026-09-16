# Known Issues

## Untested: soft keyboard on real iOS/Android

The equation input is a plain `<input type="text" inputmode="numeric">`
inside a bottom-anchored HUD. It's never been checked against a real
device's on-screen keyboard actually pushing the viewport around — the
`env(safe-area-inset-bottom)` padding is in place, but whether the
keyboard covers the equation on a small phone (especially landscape) is
unverified. Ask Chris to check on a real iPhone and Android phone.

## Unverified: very wide viewports (screenshot-only gap)

At 1920×1080 and 2560×1080, the DOM layout and the WebGL canvas/camera
frustum both check out correct via direct inspection (element bounding
rects, `gl.drawingBufferWidth/Height`), but the automated browser pane
used for this testing pass renders blank or visibly wrong screenshots
above roughly 1440px wide — a limitation of that tool, not (as far as
could be verified) the app. Worth a real-monitor spot check before
trusting it fully on an ultrawide desktop.

## Bundle size warning

`vite build` warns that the single JS chunk is ~526 kB (136 kB gzipped),
almost entirely three.js. Not addressed — the game is small and loads
fast enough in practice, and code-splitting a single-page game like this
would add complexity for little real benefit. Worth revisiting only if
load time ever becomes a complaint.

## Parabolic mode: wrong-answer arcs use the fixed-height classic trajectory

Every `arc`-kind flight in Parabolic mode (session 13) — hits and wrong
answers whose largest root lands in range — is rendered with the existing
`makeTrajectory(landingX)`, the same fixed-apex-height parabola Classic mode
uses. That's a deliberate simplification, not the real curve the player's
equation describes:

- The arc's apex height is always the fixed `APEX_HEIGHT`, not the apex the
  actual equation would have. `y = −x² + 12x` really peaks at 36, far above
  what's shown.
- The projectile always launches visually from the pad at `(0, 0)`, even
  when the real equation doesn't pass through the origin. A wrong Hard
  answer like `x − 5` has `y(0) = 11`, but nothing shows that liftoff point.

Landing position is the only thing the flight shows exactly. Revisit only if
Parabolic mode's flights need to look mathematically accurate rather than
just land in the right place.

## No automated tests

Everything in `TEST-CHECKLIST.md` is manual (plus the `console.assert`
self-checks that run in dev mode inside `trajectory.js` and
`equations.js`). There's no CI test run — a regression would only be
caught by re-running the checklist by hand.
