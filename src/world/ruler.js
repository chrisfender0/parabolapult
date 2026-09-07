import * as THREE from 'three';

// Ground ruler: x in [0, 24], minor tick every unit, major tick + label
// every 2 units. Marker n always maps 1:1 to world-space x — every other
// module (launcher, target, later the trajectory math) reads this instead
// of hardcoding the mapping.
const RULER_MIN = 0;
const RULER_MAX = 24;
const MAJOR_STEP = 2;

const LINE_COLOR = 0x4fd1ff; // var(--color-accent)
const LABEL_COLOR = '#e8f0fa'; // var(--color-ink)
const LABEL_SHADOW = 'rgba(10, 20, 32, 0.9)';

export function worldXForMarker(n) {
  return n;
}

// Shared label-sprite generator, reused by target.js for its own number
// readout so both look like they belong to the same instrument.
export function makeLabel(text, { fontSize = 96, color = LABEL_COLOR } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  const textWidth = ctx.measureText(text).width;

  const padding = fontSize * 0.4;
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = Math.ceil(fontSize * 1.5);

  // Re-set font: sizing the canvas resets the 2d context.
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = LABEL_SHADOW;
  ctx.shadowBlur = fontSize * 0.25;
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);

  const worldHeight = 0.9;
  const worldWidth = worldHeight * (canvas.width / canvas.height);
  sprite.scale.set(worldWidth, worldHeight, 1);

  return sprite;
}

export function createRuler() {
  const group = new THREE.Group();
  group.name = 'ruler';

  const groundLine = new THREE.Mesh(
    new THREE.BoxGeometry(RULER_MAX - RULER_MIN, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: LINE_COLOR })
  );
  groundLine.position.set((RULER_MIN + RULER_MAX) / 2, 0, 0.05);
  group.add(groundLine);

  const tickMaterial = new THREE.MeshBasicMaterial({ color: LINE_COLOR });

  for (let n = RULER_MIN; n <= RULER_MAX; n += 1) {
    const isMajor = n % MAJOR_STEP === 0;
    const tickHeight = isMajor ? 0.5 : 0.22;
    const tickWidth = isMajor ? 0.05 : 0.03;

    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(tickWidth, tickHeight, 0.06),
      tickMaterial
    );
    tick.position.set(worldXForMarker(n), tickHeight / 2, 0.06);
    group.add(tick);

    if (isMajor) {
      const label = makeLabel(String(n));
      label.position.set(worldXForMarker(n), tickHeight + 0.5, 0.1);
      group.add(label);
    }
  }

  return group;
}
