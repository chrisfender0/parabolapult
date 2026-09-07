import * as THREE from 'three';
import { worldXForMarker } from './ruler.js';

// Procedural catapult at marker 0: a wedge base, a pivot post, an angled
// arm, and a small cup at the tip. Primitives only, flat-shaded to match
// the blueprint look (no lights are set up yet, so MeshBasicMaterial keeps
// everything visible without one).
const BASE_COLOR = 0x2a4a63;
const ARM_COLOR = 0x4fd1ff; // var(--color-accent)
const CUP_COLOR = 0xffb84d; // var(--color-hard-1)

export function createLauncher() {
  const group = new THREE.Group();
  group.name = 'launcher';
  group.position.x = worldXForMarker(0);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.5, 1.2),
    new THREE.MeshBasicMaterial({ color: BASE_COLOR })
  );
  base.position.set(0, 0.25, 0);
  group.add(base);

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.1, 0.24),
    new THREE.MeshBasicMaterial({ color: BASE_COLOR })
  );
  post.position.set(-0.1, 1.05, 0);
  group.add(post);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: ARM_COLOR })
  );
  arm.position.set(0.35, 1.55, 0);
  arm.rotation.z = Math.PI / 8;
  group.add(arm);

  const cup = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: CUP_COLOR })
  );
  cup.position.set(1.0, 1.87, 0);
  cup.rotation.x = Math.PI;
  group.add(cup);

  // Where the projectile spawns from, in world space. The launcher never
  // moves, so this can be computed once rather than tracked live.
  const muzzle = new THREE.Vector3(group.position.x + 1.0, 1.98, 0);

  return { group, muzzle };
}
