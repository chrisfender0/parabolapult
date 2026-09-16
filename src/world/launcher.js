import * as THREE from 'three';
import { worldXForMarker } from './ruler.js';
import { easeOutBack, easeOutQuad } from '../utils/ease.js';
import { prefersReducedMotion } from '../utils/motion.js';

// Procedural catapult at marker 0: a wedge base, a pivot post, an angled
// arm, and a small cup at the tip. Primitives only, flat-shaded to match
// the blueprint look (no lights are set up yet, so MeshBasicMaterial keeps
// everything visible without one).
const BASE_COLOR = 0x2a4a63;
const ARM_COLOR = 0x4fd1ff; // var(--color-accent)
const CUP_COLOR = 0xffb84d; // var(--color-hard-1)

// Arm + cup pivot at the post's top — the pivot itself sits at rotation 0
// at rest; firing adds a fast forward swing on top, then eases back.
const PIVOT_POSITION = new THREE.Vector3(-0.1, 1.55, 0);
const SWING_ANGLE = Math.PI / 2.6; // extra forward rotation at the peak of the release
const SWING_OUT_DURATION = 0.16; // snap forward — fast
const SWING_BACK_DURATION = 0.5; // ease back to the loaded stance

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

  const pivot = new THREE.Group();
  pivot.name = 'launcher-pivot';
  pivot.position.copy(PIVOT_POSITION);
  group.add(pivot);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: ARM_COLOR })
  );
  // Local to the pivot now, not the launcher group — same world position
  // as before (0.35, 1.55, 0) minus the pivot's own offset.
  arm.position.set(0.45, 0, 0);
  arm.rotation.z = Math.PI / 8;
  pivot.add(arm);

  const cup = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: CUP_COLOR })
  );
  cup.position.set(1.1, 0.32, 0);
  cup.rotation.x = Math.PI;
  pivot.add(cup);

  // Where the projectile spawns from, in world space. The launcher never
  // moves, so this can be computed once rather than tracked live — the
  // arm's swing animation is purely cosmetic and doesn't feed back into it.
  const muzzle = new THREE.Vector3(group.position.x + 1.0, 1.98, 0);

  // Release swing: fires on launch, snaps the pivot forward, then eases
  // it back to the resting (loaded) angle. Driven by update(dt) from the
  // main render loop rather than a CSS/tween library, matching every
  // other timed effect in game/effects.js.
  let phase = 'idle'; // 'idle' | 'out' | 'back'
  let elapsed = 0;

  function fire() {
    if (prefersReducedMotion()) return;
    phase = 'out';
    elapsed = 0;
  }

  /** Snaps the arm back to its resting angle immediately — call when leaving the game screen mid-swing. */
  function reset() {
    phase = 'idle';
    elapsed = 0;
    pivot.rotation.z = 0;
  }

  function update(dt) {
    if (phase === 'idle') return;

    elapsed += dt;

    if (phase === 'out') {
      const t = Math.min(elapsed / SWING_OUT_DURATION, 1);
      pivot.rotation.z = SWING_ANGLE * easeOutBack(t);
      if (t >= 1) {
        phase = 'back';
        elapsed = 0;
      }
      return;
    }

    // 'back'
    const t = Math.min(elapsed / SWING_BACK_DURATION, 1);
    pivot.rotation.z = SWING_ANGLE * (1 - easeOutQuad(t));
    if (t >= 1) {
      pivot.rotation.z = 0;
      phase = 'idle';
    }
  }

  return { group, muzzle, fire, update, reset };
}
