import { createRenderer } from './core/renderer.js';
import { start } from './core/loop.js';
import { buildWorld } from './world/index.js';
import { worldXForMarker } from './world/ruler.js';
import { Projectile } from './game/Projectile.js';
import { GameController } from './game/GameController.js';
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

const projectile = new Projectile(launcher.muzzle);
scene.add(projectile.group);

const effects = createEffectsManager();
const cameraShake = createCameraShake(camera);

const game = new GameController({ projectile, target });

game.on('round:begin', ({ equation, targetMarker, round }) => {
  console.log(`[round ${round}] ${equation.prompt} (target: ${targetMarker})`);
});

game.on('try:hit', ({ landedAt }) => {
  console.log(`hit! landed at ${landedAt}`);
  effects.add(pulseGroup(target.group, { color: HIT_COLOR }));
  effects.add(dropIntoContainer(projectile.mesh));
});

game.on('try:miss', ({ landedAt, targetAt, triesRemaining }) => {
  console.log(`miss — landed at ${landedAt}, target was ${targetAt} (${triesRemaining} tries left)`);
  cameraShake.trigger(0.85);
  effects.add(createFragmentBurst(scene, projectile.mesh.position.clone(), CRASH_COLOR, 12));
  effects.add(createGroundFlash(scene, worldXForMarker(landedAt), CRASH_COLOR));
  effects.add(squashAndFade(projectile.mesh));
});

game.on('round:won', () => console.log('round:won'));
game.on('round:lost', () => console.log('round:lost'));
game.on('game:over', ({ session }) => console.log('game:over', session));

// Dev/console hooks for testing the full round flow without any UI —
// session 7 adds the real HUD/input. e.g.
//   __game.start({ difficulty: 'easy', playerName: 'chris' })
//   __game.submit('12')
window.__game = game;

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
