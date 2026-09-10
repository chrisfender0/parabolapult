// Gentle idle sway for the camera while the player is on a menu screen
// (Landing/Setup) — small and slow, just enough that the 3D scene behind
// the UI doesn't feel frozen. Not used during gameplay: Game.js's own
// camera shake owns the camera there.
const AMPLITUDE_X = 0.4;
const AMPLITUDE_Y = 0.2;
const SPEED_X = 0.15; // cycles per second
const SPEED_Y = 0.11;

export function createIdleCameraDrift(camera) {
  const basePosition = camera.position.clone();
  let elapsed = 0;

  function update(dt) {
    elapsed += dt;
    camera.position.x = basePosition.x + Math.sin(elapsed * SPEED_X * Math.PI * 2) * AMPLITUDE_X;
    camera.position.y = basePosition.y + Math.cos(elapsed * SPEED_Y * Math.PI * 2) * AMPLITUDE_Y;
  }

  function stop() {
    camera.position.copy(basePosition);
  }

  return { update, stop };
}
