import { createRenderer } from './core/renderer.js';
import { start } from './core/loop.js';
import { buildWorld } from './world/index.js';
import './core/debugHooks.js'; // registers window.__enableDebug() / __disableDebug()
import { createScreenManager } from './ui/screenManager.js';
import * as LandingScreen from './ui/screens/Landing.js';
import * as SetupScreen from './ui/screens/Setup.js';
import * as GameScreen from './ui/screens/Game.js';
import * as ResultScreen from './ui/screens/Result.js';
import './style.css';

const canvas = document.getElementById('app');
const uiRoot = document.getElementById('ui');
const { scene, camera, renderer } = createRenderer(canvas);

// Built once and kept alive for the whole session — Landing/Setup render
// on top of it (dimmed, camera gently drifting) instead of it being torn
// down and rebuilt every time the player returns to the menu.
const world = buildWorld(scene);

// Per-frame updaters registered by whichever screen is currently mounted
// (world/effects ticking, camera shake, idle drift, etc). Screens register
// on mount and unregister via the returned function from their own unmount().
const updaters = new Set();
function addUpdater(fn) {
  updaters.add(fn);
  return () => updaters.delete(fn);
}

const screens = createScreenManager(uiRoot);
const registry = { landing: LandingScreen, setup: SetupScreen, game: GameScreen, result: ResultScreen };

function showScreen(name, extra = {}) {
  screens.show(registry[name], { scene, camera, world, addUpdater, showScreen, ...extra });
}

showScreen('landing');

start((dt) => {
  for (const update of updaters) update(dt);
  renderer.render(scene, camera);
});
