import { worldXForMarker } from '../../world/ruler.js';
import { Projectile } from '../../game/Projectile.js';
import { GameController } from '../../game/GameController.js';
import {
  createEffectsManager,
  createCameraRig,
  createFragmentBurst,
  createGroundFlash,
  createDustPuff,
  createScorchMark,
  pulseGroup,
  squashAndFade,
  dropIntoContainer,
} from '../../game/effects.js';
import { mountHud } from '../hud.js';
import { exposeDebugHooks } from '../../core/debugHooks.js';
import * as sfx from '../../audio/sfx.js';

const HIT_COLOR = 0x3ddc84; // var(--color-hit)
const CRASH_COLOR = 0xff4d5e; // var(--color-crash)
const SCORE_POPUP_LIFETIME = 900; // ms, must match the CSS transition below

let cleanup = null;

/**
 * Reuses the persistent world (built once in main.js so it's already
 * visible, dimmed, behind Landing/Setup), instantiates the controller,
 * mounts the HUD, and starts a round for ctx.difficulty / ctx.playerName.
 *
 * @param {HTMLElement} root - the #ui element the HUD renders into.
 * @param {{ scene, camera, world, addUpdater, difficulty, playerName, slowMo }} ctx
 */
export function mount(root, ctx) {
  const { scene, camera, world, addUpdater, difficulty, playerName, slowMo } = ctx;
  const { launcher, target } = world;

  const projectile = new Projectile(launcher.muzzle);
  scene.add(projectile.group);

  const effects = createEffectsManager();
  const cameraRig = createCameraRig(camera);

  const game = new GameController({ projectile, target });

  // The target stays hidden until the round is actually decided — a hit,
  // or the last miss once tries run out. Revealing it on every miss would
  // hand over the answer for whatever retries are still left; a fresh
  // round hides it again regardless of how the last one ended.
  game.on('round:begin', () => {
    target.hide();
    cameraRig.settle();
  });

  game.on('launch', ({ value }) => {
    sfx.playLaunch();
    cameraRig.setFlightTarget(value);
    launcher.fire();
  });

  // Set once by round:scored (which always fires before try:hit/try:miss
  // for the same landing — see GameController._concludeRound) so the hit
  // celebration's score popup can show what was actually just earned.
  let lastPoints = 0;
  game.on('round:scored', ({ points }) => {
    lastPoints = points;
  });

  game.on('try:hit', () => {
    target.reveal();
    cameraRig.settle();
    sfx.playHit();
    slowMo?.trigger({ scale: 0.25, hold: 90, recover: 220 });
    effects.add(pulseGroup(target.group, { color: HIT_COLOR }));
    effects.add(dropIntoContainer(projectile.mesh));
    spawnScorePopup(lastPoints);
  });

  game.on('try:miss', ({ landedAt, triesRemaining }) => {
    // Revealing the container on every miss would hand over the answer
    // for the retries still left in the round — only show it once the
    // round is actually over (out of tries), matching the HUD's own
    // "landed at X — target was Y" text (see hud.js's handleMiss).
    if (triesRemaining === 0) target.reveal();
    cameraRig.settle();
    cameraRig.trigger(0.85);
    sfx.playCrash();
    const landedWorldX = worldXForMarker(landedAt);
    effects.add(createFragmentBurst(scene, projectile.mesh.position.clone(), CRASH_COLOR, 12));
    effects.add(createGroundFlash(scene, landedWorldX, CRASH_COLOR));
    effects.add(createDustPuff(scene, projectile.mesh.position.clone(), CRASH_COLOR));
    effects.add(createScorchMark(scene, landedWorldX));
    effects.add(squashAndFade(projectile.mesh));
  });

  game.on('game:over', ({ session }) => ctx.showScreen('result', { session }));

  // Floating "+N" that rises and fades over the target container —
  // projected from its 3D world position into screen space once, then
  // animated purely in CSS (see .score-popup in style.css).
  function spawnScorePopup(points) {
    if (!points) return;
    const worldPos = target.group.position.clone();
    worldPos.y += 1.4;
    worldPos.project(camera);

    const el = document.createElement('div');
    el.className = 'score-popup';
    el.textContent = `+${points}`;
    el.style.left = `${(worldPos.x * 0.5 + 0.5) * window.innerWidth}px`;
    el.style.top = `${(-worldPos.y * 0.5 + 0.5) * window.innerHeight}px`;
    root.appendChild(el);

    requestAnimationFrame(() => el.classList.add('score-popup--rise'));
    setTimeout(() => el.remove(), SCORE_POPUP_LIFETIME);
  }

  const removeUpdater = addUpdater((dt) => {
    projectile.update(dt);
    effects.update(dt);
    cameraRig.update(dt);
    launcher.update(dt);
    game.updateHard(dt);
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
    // screen's own. The launcher's arm swing is only ever driven while
    // this screen's updater is registered, so reset it in case a round
    // ends mid-swing.
    launcher.reset();
    scene.remove(projectile.group);
  };
}

export function unmount() {
  cleanup?.();
  cleanup = null;
}
