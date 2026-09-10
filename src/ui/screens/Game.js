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
import { exposeDebugHooks } from '../../core/debugHooks.js';

const HIT_COLOR = 0x3ddc84; // var(--color-hit)
const CRASH_COLOR = 0xff4d5e; // var(--color-crash)

let cleanup = null;

/**
 * Reuses the persistent world (built once in main.js so it's already
 * visible, dimmed, behind Landing/Setup), instantiates the controller,
 * mounts the HUD, and starts a round for ctx.difficulty / ctx.playerName.
 *
 * @param {HTMLElement} root - the #ui element the HUD renders into.
 * @param {{ scene, camera, world, addUpdater, difficulty, playerName }} ctx
 */
export function mount(root, ctx) {
  const { scene, camera, world, addUpdater, difficulty, playerName } = ctx;
  const { launcher, target } = world;

  const projectile = new Projectile(launcher.muzzle);
  scene.add(projectile.group);

  const effects = createEffectsManager();
  const cameraShake = createCameraShake(camera);

  const game = new GameController({ projectile, target });

  // The target stays hidden until a shot lands — its position is the
  // equation's answer, so showing it up front would let the player skip
  // solving. It reappears once revealed (hit or miss) and stays visible
  // through any retries in that round; a fresh round hides it again.
  game.on('round:begin', () => target.hide());

  game.on('try:hit', () => {
    target.reveal();
    effects.add(pulseGroup(target.group, { color: HIT_COLOR }));
    effects.add(dropIntoContainer(projectile.mesh));
  });

  game.on('try:miss', ({ landedAt }) => {
    target.reveal();
    cameraShake.trigger(0.85);
    effects.add(createFragmentBurst(scene, projectile.mesh.position.clone(), CRASH_COLOR, 12));
    effects.add(createGroundFlash(scene, worldXForMarker(landedAt), CRASH_COLOR));
    effects.add(squashAndFade(projectile.mesh));
  });

  game.on('game:over', ({ session }) => ctx.showScreen('result', { session }));

  const removeUpdater = addUpdater((dt) => {
    projectile.update(dt);
    effects.update(dt);
    cameraShake.update(dt);
  });

  const hud = mountHud(root, game);

  game.start({ difficulty, playerName });

  // Only attached when debug mode is on — see core/debugHooks.js.
  exposeDebugHooks({ __game: game, projectile, target });

  cleanup = () => {
    removeUpdater();
    hud.unmount();
    // launcher/target belong to the persistent world (main.js) and stay
    // in the scene for Landing/Setup — only the projectile is this
    // screen's own.
    scene.remove(projectile.group);
  };
}

export function unmount() {
  cleanup?.();
  cleanup = null;
}
