import * as THREE from 'three';
import { easeOutQuad, easeInQuad } from '../utils/ease.js';
import { prefersReducedMotion } from '../utils/motion.js';

// Short-lived visual effects for landings: camera shake, fragment bursts,
// ground flashes, and material pulses/tweens. Every effect factory here
// returns { update(dt), alive } — plain objects with no three.js scene
// membership assumptions beyond what they create themselves — so a single
// EffectsManager can drive them all from the main render loop and drop
// them once they report alive === false.

const GRAVITY = -9;

/** Holds a bag of active effects and steps + reaps them each frame. */
export function createEffectsManager() {
  const active = [];

  function add(effect) {
    active.push(effect);
    return effect;
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const effect = active[i];
      effect.update(dt);
      if (effect.alive === false) {
        active.splice(i, 1);
      }
    }
  }

  return { add, update };
}

/**
 * Combines decaying screen-space camera shake with a gentle horizontal
 * "follow" (and slight zoom-out) toward wherever a shot is headed, all
 * relative to the camera's position/zoom at creation time.
 *
 * update() must run every frame regardless of whether anything is
 * active — it's also responsible for holding the camera at its resting
 * position/zoom otherwise.
 *
 * The horizontal offset and zoom-out are deliberately small: renderer.js
 * frames the camera so the *entire* ruler is always visible, so a follow
 * effect that actually panned to track the projectile would crop the
 * ends of the ruler. This only nudges toward long shots, it never
 * recenters on them.
 */
export function createCameraRig(camera) {
  const basePosition = camera.position.clone();
  const baseZoom = camera.zoom;

  const MAX_FOLLOW_OFFSET = 0.6;
  const MAX_ZOOM_OUT = 0.08;
  const LERP_RATE = 4; // per second

  let trauma = 0;
  let followTarget = 0;
  let followCurrent = 0;
  let zoomTarget = 0;
  let zoomCurrent = 0;

  function trigger(amount = 1) {
    if (prefersReducedMotion()) return;
    trauma = Math.min(1, trauma + amount);
  }

  /** Call once a shot launches, with the distance it's headed to (and the playable range's max). */
  function setFlightTarget(landingX, rangeMax = 24) {
    if (prefersReducedMotion() || !Number.isFinite(landingX)) {
      followTarget = 0;
      zoomTarget = 0;
      return;
    }
    const t = Math.min(Math.max(landingX / rangeMax, 0), 1);
    followTarget = t * MAX_FOLLOW_OFFSET;
    zoomTarget = t * MAX_ZOOM_OUT;
  }

  /** Call once a shot has landed, to ease back to the resting framing. */
  function settle() {
    followTarget = 0;
    zoomTarget = 0;
  }

  function update(dt) {
    const lerpAmount = Math.min(1, dt * LERP_RATE);
    followCurrent += (followTarget - followCurrent) * lerpAmount;
    zoomCurrent += (zoomTarget - zoomCurrent) * lerpAmount;

    let shakeX = 0;
    let shakeY = 0;
    if (trauma > 0) {
      trauma = Math.max(0, trauma - dt * 2.5);
      const strength = trauma * trauma; // ease-out — sharp at impact, quick to settle
      shakeX = (Math.random() * 2 - 1) * 0.35 * strength;
      shakeY = (Math.random() * 2 - 1) * 0.35 * strength;
    }

    camera.position.set(basePosition.x + followCurrent + shakeX, basePosition.y + shakeY, basePosition.z);
    camera.zoom = baseZoom * (1 - zoomCurrent);
    camera.updateProjectionMatrix();
  }

  return { trigger, setFlightTarget, settle, update };
}

/** A dozen tumbling fragments with simple gravity, fading out over their lifetime. */
export function createFragmentBurst(scene, position, color, count = 12) {
  const LIFETIME = 0.9;
  const group = new THREE.Group();
  const fragments = [];

  for (let i = 0; i < count; i += 1) {
    const size = 0.06 + Math.random() * 0.08;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color, transparent: true })
    );
    mesh.position.copy(position);
    group.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    fragments.push({
      mesh,
      velocity: new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 3 + 1.5,
        (Math.random() - 0.5) * 0.6
      ),
      spin: (Math.random() - 0.5) * 10,
    });
  }

  scene.add(group);

  let elapsed = 0;
  let alive = true;

  function dispose() {
    alive = false;
    scene.remove(group);
    for (const fragment of fragments) {
      fragment.mesh.geometry.dispose();
      fragment.mesh.material.dispose();
    }
  }

  function update(dt) {
    if (!alive) return;
    elapsed += dt;
    const fade = Math.max(0, 1 - elapsed / LIFETIME);

    for (const fragment of fragments) {
      fragment.velocity.y += GRAVITY * dt;
      fragment.mesh.position.addScaledVector(fragment.velocity, dt);
      fragment.mesh.rotation.x += fragment.spin * dt;
      fragment.mesh.rotation.y += fragment.spin * dt * 0.7;
      fragment.mesh.material.opacity = fade;
    }

    if (elapsed >= LIFETIME) dispose();
  }

  return { update, get alive() { return alive; } };
}

/** A flat ring on the ground at world x that flashes and expands, then vanishes. */
export function createGroundFlash(scene, x, color) {
  const DURATION = 0.5;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );
  mesh.position.set(x, 0.03, 0.25);
  scene.add(mesh);

  let elapsed = 0;
  let alive = true;

  function dispose() {
    alive = false;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  function update(dt) {
    if (!alive) return;
    elapsed += dt;
    const t = Math.min(elapsed / DURATION, 1);
    const eased = easeOutQuad(t);
    mesh.scale.setScalar(1 + eased * 1.8);
    mesh.material.opacity = 0.85 * (1 - eased);
    if (t >= 1) dispose();
  }

  return { update, get alive() { return alive; } };
}

/** A soft, fast-expanding puff at the crash point — rounder and slower than the sharp flash ring. */
export function createDustPuff(scene, position, color = 0xb9c4d1) {
  const DURATION = 0.6;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
  );
  mesh.position.set(position.x, 0.05, 0.22);
  scene.add(mesh);

  let elapsed = 0;
  let alive = true;

  function dispose() {
    alive = false;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  function update(dt) {
    if (!alive) return;
    elapsed += dt;
    const t = Math.min(elapsed / DURATION, 1);
    const eased = easeOutQuad(t);
    mesh.scale.setScalar(1 + eased * 2.4);
    mesh.material.opacity = 0.5 * (1 - eased);
    if (t >= 1) dispose();
  }

  return { update, get alive() { return alive; } };
}

/** A lingering scorch mark on the ground at world x — fades out over a couple of seconds. */
export function createScorchMark(scene, x, color = 0x140b09) {
  const DURATION = 2.4;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
  );
  mesh.position.set(x, 0.015, 0.15);
  scene.add(mesh);

  let elapsed = 0;
  let alive = true;

  function dispose() {
    alive = false;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  function update(dt) {
    if (!alive) return;
    elapsed += dt;
    const t = Math.min(elapsed / DURATION, 1);
    mesh.material.opacity = 0.6 * (1 - easeInQuad(t));
    if (t >= 1) dispose();
  }

  return { update, get alive() { return alive; } };
}

/**
 * Pulses every mesh material under `group` toward `color` and back —
 * used to flash the whole target container on a hit without target.js
 * needing to expose its individual meshes for this one purpose.
 */
export function pulseGroup(group, { color, duration = 0.6, peakMix = 0.85 } = {}) {
  const flashColor = new THREE.Color(color);
  const targets = [];

  group.traverse((child) => {
    if (child.isMesh && child.material && child.material.color) {
      targets.push({
        material: child.material,
        baseColor: child.material.color.clone(),
        baseOpacity: child.material.opacity,
      });
    }
  });

  let elapsed = 0;
  let alive = true;

  function update(dt) {
    if (!alive) return;
    elapsed += dt;
    const t = Math.min(elapsed / duration, 1);
    const intensity = Math.sin(Math.PI * t); // ramp up then back down

    for (const target of targets) {
      target.material.color.copy(target.baseColor).lerp(flashColor, intensity * peakMix);
      target.material.opacity = Math.min(1, target.baseOpacity + intensity * (1 - target.baseOpacity));
    }

    if (t >= 1) {
      for (const target of targets) {
        target.material.color.copy(target.baseColor);
        target.material.opacity = target.baseOpacity;
      }
      alive = false;
    }
  }

  return { update, get alive() { return alive; } };
}

/** Quick squash-and-hide for a miss: flattens the mesh in place, then hides it. */
export function squashAndFade(mesh, { duration = 0.25 } = {}) {
  const baseScale = mesh.scale.clone();
  let elapsed = 0;
  let alive = true;

  function update(dt) {
    if (!alive) return;
    elapsed += dt;
    const t = easeOutQuad(Math.min(elapsed / duration, 1));
    mesh.scale.set(
      baseScale.x * (1 + t * 1.4),
      baseScale.y * Math.max(0.15, 1 - t * 1.3),
      baseScale.z * (1 + t * 1.4)
    );
    if (elapsed >= duration) {
      mesh.visible = false;
      alive = false;
    }
  }

  return { update, get alive() { return alive; } };
}

/** Short extra fall + shrink for a hit: drops the mesh past y = 0 as if caught by the container floor, then hides it. */
export function dropIntoContainer(mesh, { duration = 0.25, depth = 0.35 } = {}) {
  const startY = mesh.position.y;
  let elapsed = 0;
  let alive = true;

  function update(dt) {
    if (!alive) return;
    elapsed += dt;
    const t = easeOutQuad(Math.min(elapsed / duration, 1));
    mesh.position.y = startY - depth * t;
    mesh.scale.setScalar(Math.max(0.1, 1 - 0.6 * t));
    if (elapsed >= duration) {
      mesh.visible = false;
      alive = false;
    }
  }

  return { update, get alive() { return alive; } };
}
