import { buildWorld } from '../../world/index.js';
import { worldXForMarker } from '../../world/ruler.js';
import { Projectile } from '../../game/Projectile.js';
import { GameController } from '../../game/GameController.js';
import {
  createEffectsManager,
  createCameraShake,
  createFragmentBurst,
  createGroundFlash,
  pulseGroup,
  squashAndFade,
  dropIntoContainer,
} from '../../game/effects.js';
import { mountHud } from '../hud.js';

const HIT_COLOR = 0x3ddc84; // var(--color-hit)
const CRASH_COLOR = 0xff4d5e; // var(--color-crash)

let cleanup = null;

/**
 * Builds the world, instantiates the controller, mounts the HUD, and
 * starts a round for ctx.difficulty / ctx.playerName.
 *
 * @param {HTMLElement} root - the #ui element the HUD renders into.
 * @param {{ scene, camera, addUpdater, difficulty, playerName }} ctx
 */
export function mount(root, ctx) {
  const { scene, camera, addUpdater, difficulty, playerName } = ctx;

  const { launcher, target } = buildWorld(scene);

  const projectile = new Projectile(launcher.muzzle);
  scene.add(projectile.group);

  const effects = createEffectsManager();
  const cameraShake = createCameraShake(camera);

  const game = new GameController({ projectile, target });

  game.on('try:hit', () => {
    effects.add(pulseGroup(target.group, { color: HIT_COLOR }));
    effects.add(dropIntoContainer(projectile.mesh));
  });

  game.on('try:miss', ({ landedAt }) => {
    cameraShake.trigger(0.85);
    effects.add(createFragmentBurst(scene, projectile.mesh.position.clone(), CRASH_COLOR, 12));
    effects.add(createGroundFlash(scene, worldXForMarker(landedAt), CRASH_COLOR));
    effects.add(squashAndFade(projectile.mesh));
  });

  const removeUpdater = addUpdater((dt) => {
    projectile.update(dt);
    effects.update(dt);
    cameraShake.update(dt);
  });

  const hud = mountHud(root, game);

  game.start({ difficulty, playerName });

  // Exposed for manual testing from the browser console.
  window.__game = game;
  window.projectile = projectile;
  window.target = target;

  cleanup = () => {
    removeUpdater();
    hud.unmount();
    scene.remove(launcher.group, target.group, projectile.group);
  };
}

export function unmount() {
  cleanup?.();
  cleanup = null;
}
