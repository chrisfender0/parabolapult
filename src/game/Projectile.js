import * as THREE from 'three';
import { Emitter } from '../utils/Emitter.js';

// Small faceted "boulder" — flat MeshBasicMaterial to match the rest of
// the scene, which has no lights set up.
const MESH_COLOR = 0xe8f0fa; // var(--color-ink)
const TRAIL_COLOR = 0x4fd1ff; // var(--color-accent)
const TRAIL_SAMPLES = 48;

// Drawn ahead of the ruler's ticks/labels (z <= ~0.3) and the target
// group (z <= ~0.1) so the flight always renders on top of the world.
const PROJECTILE_Z = 0.4;
const TRAIL_Z = 0.35;

const SPIN_X = 6;
const SPIN_Z = 4;

/**
 * A single projectile: mesh + progressively-revealed arc trail, driven by
 * a trajectory from src/math/trajectory.js. The trajectory's own x runs
 * from 0 to landingX; this class re-maps that onto world space by
 * lerping from the launcher's muzzle position to the landing marker, so
 * the flight visually starts at the cup tip even though the muzzle isn't
 * planted exactly on marker 0.
 */
export class Projectile extends Emitter {
  constructor(muzzle) {
    super();

    this.muzzle = muzzle.clone();

    this.group = new THREE.Group();
    this.group.name = 'projectile';

    this.mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshBasicMaterial({ color: MESH_COLOR })
    );
    this.group.add(this.mesh);

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((TRAIL_SAMPLES + 1) * 3), 3)
    );
    trailGeometry.setDrawRange(0, 0);

    this.trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({ color: TRAIL_COLOR, transparent: true, opacity: 0.55 })
    );
    // The draw range shrinks/grows every frame during flight; recomputing
    // a bounding sphere for culling on every update is wasted work for a
    // trail that never leaves the camera's fixed frustum.
    this.trail.frustumCulled = false;
    this.group.add(this.trail);

    this.trajectory = null;
    this.flying = false;
    this.elapsed = 0;
    this.startWorld = new THREE.Vector3();
    this.landWorld = new THREE.Vector3();

    this.reset();
  }

  /** Reset state and begin flying the given trajectory (from makeTrajectory). */
  launch(trajectory) {
    this.reset();
    this.trajectory = trajectory;
    this.flying = true;
    this.elapsed = 0;

    this.startWorld.copy(this.muzzle);
    // Fizzled (null) trajectories never really leave the muzzle.
    if (trajectory.isNull) {
      this.landWorld.copy(this.muzzle);
    } else {
      this.landWorld.set(trajectory.landingX, 0, this.muzzle.z);
    }

    const positions = this.trail.geometry.attributes.position.array;
    for (let i = 0; i <= TRAIL_SAMPLES; i += 1) {
      const localT = i / TRAIL_SAMPLES;
      const point = this._worldPointAt(localT);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = TRAIL_Z;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.setDrawRange(0, 1);

    this.mesh.visible = true;
    this.mesh.scale.set(1, 1, 1);
    this._placeMesh(0);
  }

  /** Advance the flight by dt seconds. Emits 'land' once t reaches 1. */
  update(dt) {
    if (!this.flying || !this.trajectory) return;

    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.trajectory.duration, 1);

    this._placeMesh(t);
    this.mesh.rotation.x += dt * SPIN_X;
    this.mesh.rotation.z += dt * SPIN_Z;

    const visibleSamples = Math.max(1, Math.round(t * TRAIL_SAMPLES) + 1);
    this.trail.geometry.setDrawRange(0, visibleSamples);

    if (t >= 1) {
      this.flying = false;
      this.emit('land', {
        trajectory: this.trajectory,
        position: this.mesh.position.clone(),
      });
    }
  }

  /** Return to the muzzle and clear the trail. Safe to call mid-flight. */
  reset() {
    this.flying = false;
    this.elapsed = 0;
    this.trajectory = null;

    this.mesh.visible = true;
    this.mesh.scale.set(1, 1, 1);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.position.copy(this.muzzle);

    this.trail.geometry.setDrawRange(0, 0);
  }

  // World-space point along the flight at t in [0, 1]. Horizontal position
  // is lerped from the muzzle to the landing marker (a visual convenience
  // so the arc starts at the cup tip); vertical position is the same lerp
  // toward ground level with the trajectory's own arc height added on top,
  // so the apex height from trajectory.js is preserved exactly.
  _worldPointAt(t) {
    const local = this.trajectory.pointAt(t);
    const x = THREE.MathUtils.lerp(this.startWorld.x, this.landWorld.x, t);
    const y = THREE.MathUtils.lerp(this.startWorld.y, 0, t) + local.y;
    return { x, y };
  }

  _placeMesh(t) {
    const point = this._worldPointAt(t);
    this.mesh.position.set(point.x, point.y, PROJECTILE_Z);
  }
}
