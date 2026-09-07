# Session 7 — HUD and Equation Input

## Goal

The overlay the player actually uses: the equation with an inline blank, a number input, a Launch button, tries remaining, and hit/miss feedback — all driven by session 6's events.

## Depends on

Session 6.

## Tasks

- `src/ui/screenManager.js`: mounts/unmounts screen modules into `#ui`, one active at a time. Screens are plain modules exporting `mount(root, ctx)` / `unmount()`.
- `src/ui/hud.js`:
  - **Equation panel** (bottom center, safe-area aware): renders the structured equation with the blank as a real `<input type="text" inputmode="numeric" pattern="[0-9]*">` sized to a couple of characters, so mobile gets a numeric keypad.
  - **Launch button** next to the input; Enter key also submits.
  - **Tries indicator**: three pips that visibly burn out on each miss.
  - **Target readout**: small line like `Target: marker 12` reinforcing the ruler.
  - **Feedback**: on `try:miss`, shake the input and show `Landed at 9 — target was 12`; on `try:hit`, a success banner; on `round:lost`, a short "Out of tries" state with a Continue button.
  - Input is disabled while a flight is in the air and re-enabled on resolution.
- `src/ui/screens/Game.js`: thin screen that builds the world (if not already built), instantiates the controller, mounts the HUD, and forwards `ctx.difficulty` / `ctx.playerName`.
- CSS: overlay children get `pointer-events: auto`; equation panel uses large type; layout works in portrait without covering the target container (keep the play area's lower third clear or shift the camera up when the keyboard opens).

## Files touched

`src/ui/screenManager.js`, `src/ui/hud.js`, `src/ui/screens/Game.js` (new); `src/style.css`, `src/main.js` (edit).

## Done when

Loading the page drops straight into an easy game: the equation reads with a blank, typing a number and pressing Launch fires the projectile, hits and misses both show clear feedback, the pips burn down, and after three misses the round ends. Works with a soft keyboard on a phone-sized viewport without hiding the equation.

## Ask Chris to

Play a few rounds on a phone and report anything awkward about the input, keyboard behavior, or where the panel sits.
