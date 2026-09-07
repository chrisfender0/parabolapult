import * as THREE from 'three';

// Large procedural graph-paper backdrop, drawn once into a CanvasTexture.
// Sized to comfortably exceed the camera frustum at any supported aspect
// ratio (see core/renderer.js), including the tall portrait case where the
// vertical half-extent grows a lot to keep the full 0-24 ruler visible.
const WORLD_WIDTH = 80;
const WORLD_HEIGHT = 100;
const CENTER_X = 12; // matches renderer.js WORLD_CENTER_X
const CENTER_Y = 5; // matches renderer.js WORLD_CENTER_Y

const CANVAS_PPU = 24; // canvas pixels per world unit
const BG_COLOR = '#0a1420'; // var(--color-bg)
const FINE_LINE_COLOR = 'rgba(30, 58, 84, 0.55)'; // var(--color-grid-line), softened
const HEAVY_LINE_COLOR = 'rgba(60, 108, 148, 0.85)';

function drawGraphPaper() {
  const width = WORLD_WIDTH * CANVAS_PPU;
  const height = WORLD_HEIGHT * CANVAS_PPU;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Fine grid, every 1 world unit.
  ctx.lineWidth = 1;
  ctx.strokeStyle = FINE_LINE_COLOR;
  ctx.beginPath();
  for (let x = 0; x <= width; x += CANVAS_PPU) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += CANVAS_PPU) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  // Heavier grid, every 5 world units.
  ctx.lineWidth = 2;
  ctx.strokeStyle = HEAVY_LINE_COLOR;
  ctx.beginPath();
  const majorStep = CANVAS_PPU * 5;
  for (let x = 0; x <= width; x += majorStep) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += majorStep) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  // Faint vignette so the edges recede instead of hard-cutting.
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.25,
    width / 2, height / 2, Math.max(width, height) * 0.65
  );
  vignette.addColorStop(0, 'rgba(10, 20, 32, 0)');
  vignette.addColorStop(1, 'rgba(10, 20, 32, 0.85)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

export function createBackdrop() {
  const texture = new THREE.CanvasTexture(drawGraphPaper());
  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_HEIGHT);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'backdrop';
  mesh.position.set(CENTER_X, CENTER_Y, -10);

  return mesh;
}
