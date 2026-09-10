import * as THREE from 'three';
import { worldXForMarker, makeLabel } from './ruler.js';
import { isDebugEnabled } from '../core/debugHooks.js';

// Open-topped container: floor + two side walls, no lid, plus a soft glow
// disc and a number label that both update when setMarker moves it.
const FLOOR_COLOR = 0x2a4a63;
const WALL_COLOR = 0x1e3a54; // var(--color-grid-line)
const GLOW_COLOR = 0x3ddc84; // var(--color-hit)
const LABEL_COLOR = '#3ddc84'; // var(--color-hit)

const CONTAINER_WIDTH = 1.4;
const CONTAINER_DEPTH = 1.0;
const FLOOR_THICKNESS = 0.1;
const WALL_HEIGHT = 0.7;
const WALL_THICKNESS = 0.12;

export function createTarget() {
  const group = new THREE.Group();
  group.name = 'target';
  // Hidden until a shot lands (reveal()) — its position is the equation's
  // answer, so showing it up front would let the player skip solving.
  // Debug mode leaves it visible throughout for testing.
  group.visible = isDebugEnabled();

  // Soft glow so the container reads as "a place things land" even before
  // the number label is legible.
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 32),
    new THREE.MeshBasicMaterial({ color: GLOW_COLOR, transparent: true, opacity: 0.18 })
  );
  glow.position.set(0, 0.02, -0.05);
  group.add(glow);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(CONTAINER_WIDTH, FLOOR_THICKNESS, CONTAINER_DEPTH),
    new THREE.MeshBasicMaterial({ color: FLOOR_COLOR })
  );
  floor.position.set(0, FLOOR_THICKNESS / 2, 0);
  group.add(floor);

  const wallMaterial = new THREE.MeshBasicMaterial({ color: WALL_COLOR });
  const wallY = FLOOR_THICKNESS + WALL_HEIGHT / 2;

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CONTAINER_DEPTH),
    wallMaterial
  );
  leftWall.position.set(-CONTAINER_WIDTH / 2 + WALL_THICKNESS / 2, wallY, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CONTAINER_DEPTH),
    wallMaterial
  );
  rightWall.position.set(CONTAINER_WIDTH / 2 - WALL_THICKNESS / 2, wallY, 0);
  group.add(rightWall);

  let label = null;

  function setMarker(n) {
    group.position.x = worldXForMarker(n);

    if (label) {
      group.remove(label);
      label.material.map.dispose();
      label.material.dispose();
      label = null;
    }

    // The player is meant to read the target's position off the ruler
    // themselves — a floating number handing over the answer only shows
    // up in debug mode (see core/debugHooks.js).
    if (isDebugEnabled()) {
      label = makeLabel(String(n), { color: LABEL_COLOR });
      label.position.set(0, FLOOR_THICKNESS + WALL_HEIGHT + 1.3, 0.1);
      group.add(label);
    }
  }

  /** Shows the container — call once a shot has landed (hit or miss). */
  function reveal() {
    group.visible = true;
  }

  /** Hides the container again for a fresh, unsolved round. No-op in debug mode. */
  function hide() {
    group.visible = isDebugEnabled();
  }

  return { group, setMarker, reveal, hide };
}
