import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { start } from './core/loop.js';
import './style.css';

const canvas = document.getElementById('app');
const { scene, camera, renderer } = createRenderer(canvas);

// Temporary reference object so it's obvious the scene is rendering.
// Later sessions replace this with the actual world (ground, ruler,
// launcher, target).
const referenceBox = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshBasicMaterial({ color: 0x4fd1ff, wireframe: true })
);
referenceBox.position.set(12, 5, 0);
scene.add(referenceBox);

start((deltaTime) => {
  referenceBox.rotation.x += deltaTime * 0.6;
  referenceBox.rotation.y += deltaTime * 0.8;
  renderer.render(scene, camera);
});
