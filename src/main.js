import { createRenderer } from './core/renderer.js';
import { start } from './core/loop.js';
import { createScreenManager } from './ui/screenManager.js';
import * as GameScreen from './ui/screens/Game.js';
import './style.css';

const canvas = document.getElementById('app');
const uiRoot = document.getElementById('ui');
const { scene, camera, renderer } = createRenderer(canvas);

// Per-frame updaters registered by whichever screen is currently mounted
// (world/effects ticking, camera shake, etc). Screens register on mount
// and unregister via the returned function from their own unmount().
const updaters = new Set();
function addUpdater(fn) {
  updaters.add(fn);
  return () => updaters.delete(fn);
}

const screens = createScreenManager(uiRoot);

// Session 8 adds Landing/Setup screens ahead of this; for now the page
// drops straight into an easy game.
screens.show(GameScreen, {
  scene,
  camera,
  addUpdater,
  difficulty: 'easy',
  playerName: 'Player',
});

start((dt) => {
  for (const update of updaters) update(dt);
  renderer.render(scene, camera);
});
