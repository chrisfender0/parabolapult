import * as THREE from 'three';

// World-space framing: the ruler runs roughly x in [-2, 26], y in [-2, 12].
// We keep the horizontal span fixed across every aspect ratio so the full
// ruler is always visible (never cropped) even on a narrow phone; vertical
// extent grows or shrinks to fill whatever is left.
const WORLD_CENTER_X = 12; // midpoint of [-2, 26]
const WORLD_HALF_WIDTH = 14; // half of the 28-unit horizontal span
const WORLD_CENTER_Y = 5; // midpoint of [-2, 12]

export function createRenderer(canvas) {
  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  camera.position.set(WORLD_CENTER_X, WORLD_CENTER_Y, 20);
  camera.lookAt(WORLD_CENTER_X, WORLD_CENTER_Y, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    const halfWidth = WORLD_HALF_WIDTH;
    const halfHeight = halfWidth / aspect;

    camera.left = WORLD_CENTER_X - halfWidth;
    camera.right = WORLD_CENTER_X + halfWidth;
    camera.top = WORLD_CENTER_Y + halfHeight;
    camera.bottom = WORLD_CENTER_Y - halfHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
  }

  resize();
  window.addEventListener('resize', resize);

  return { scene, camera, renderer, resize };
}
