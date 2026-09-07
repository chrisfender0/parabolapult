import { createRenderer } from './core/renderer.js';
import { start } from './core/loop.js';
import { buildWorld } from './world/index.js';
import './style.css';

const canvas = document.getElementById('app');
const { scene, camera, renderer } = createRenderer(canvas);

const { ruler, launcher, target } = buildWorld(scene);

// Exposed for manual testing from the browser console, e.g.
// target.setMarker(5)
window.ruler = ruler;
window.launcher = launcher;
window.target = target;

start(() => {
  renderer.render(scene, camera);
});
