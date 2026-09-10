import { createRenderer } from './core/renderer.js';
import { start } from './core/loop.js';
import { buildWorld } from './world/index.js';
import { worldXForMarker } from './world/ruler.js';
import { makeTrajectory } from './math/trajectory.js';
import { Projectile } from './game/Projectile.js';
import { resolveOutcome } from './game/flightOutcome.js';
import {
  createEffectsManager,
  createCameraShake,
  createFragmentBurst,
  createGroundFlash,
  pulseGroup,
  squashAndFade,
  dropIntoContainer,
} from './game/effects.js';
import './style.css';

const HIT_COLOR = 0x3ddc84; // var(--color-hit)
const CRASH_COLOR = 0xff4d5e; // var(--color-crash)

const canvas = document.getElementById('app');
const { scene, camera, renderer } = createRenderer(canvas);

const { ruler, launcher, target } = buildWorld(scene);

// world/target.js doesn't expose its own marker yet (see
// game/flightOutcome.js), so this session tracks it alongside the visual
// target. Session 6's GameController takes over ownership of this.
let targetMarker = 12;

const projectile = new Projectile(launcher.muzzle);
scene.add(projectile.group);

const effects = createEffectsManager();
const cameraShake = createCameraShake(camera);

projectile.on('land', ({ trajectory }) => {
  const result = resolveOutcome(trajectory, targetMarker);

  if (result.outcome === 'hit') {
    effects.add(pulseGroup(target.group, { color: HIT_COLOR }));
    effects.add(dropIntoContainer(projectile.mesh));
  } else {
    cameraShake.trigger(0.85);
    effects.add(createFragmentBurst(scene, projectile.mesh.position.clone(), CRASH_COLOR, 12));
    effects.add(createGroundFlash(scene, worldXForMarker(result.landedAt), CRASH_COLOR));
    effects.add(squashAndFade(projectile.mesh));
  }
});

// Dev-only hooks for testing flights without any UI — session 7 adds the
// real HUD/input. __fire(n) launches a projectile as if the player had
// answered n; __setTarget(n) moves the target (and the marker this dev
// hook compares against) without a full round.
window.__fire = function __fire(landingX) {
  projectile.launch(makeTrajectory(landingX));
};
window.__setTarget = function __setTarget(marker) {
  targetMarker = marker;
  target.setMarker(marker);
};

// Exposed for manual testing from the browser console, e.g.
// target.setMarker(5)
window.ruler = ruler;
window.launcher = launcher;
window.target = target;
window.projectile = projectile;

start((dt) => {
  projectile.update(dt);
  effects.update(dt);
  cameraShake.update(dt);
  renderer.render(scene, camera);
});
