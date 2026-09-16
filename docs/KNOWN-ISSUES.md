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

## No automated tests

Everything in `TEST-CHECKLIST.md` is manual (plus the `console.assert`
self-checks that run in dev mode inside `trajectory.js` and
`equations.js`). There's no CI test run — a regression would only be
caught by re-running the checklist by hand.
