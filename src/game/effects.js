import * as THREE from 'three';

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
 * Decaying screen-space camera shake. trigger() adds trauma (clamped to
 * 1); update() must run every frame regardless of whether a shake is
 * active, since it's also responsible for holding the camera at its base
 * position when idle.
 */
export function createCameraShake(camera) {
  const basePosition = camera.position.clone();
  let trauma = 0;

  function trigger(amount = 1) {
    trauma = Math.min(1, trauma + amount);
  }

  function update(dt) {
    if (trauma <= 0) {
      camera.position.copy(basePosition);
      return;
    }
    trauma = Math.max(0, trauma - dt * 2.5);
    const strength = trauma * trauma; // ease-out — sharp at impact, quick to settle
    const offsetX = (Math.random() * 2 - 1) * 0.35 * strength;
    const offsetY = (Math.random() * 2 - 1) * 0.35 * strength;
    camera.position.set(basePosition.x + offsetX, basePosition.y + offsetY, basePosition.z);
  }

  return { trigger, update };
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
    mesh.scale.setScalar(1 + t * 1.8);
    mesh.material.opacity = 0.85 * (1 - t);
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
    const t = Math.min(elapsed / duration, 1);
    mesh.scale.set(
      baseScale.x * (1 + t * 1.4),
      baseScale.y * Math.max(0.15, 1 - t * 1.3),
      baseScale.z * (1 + t * 1.4)
    );
    if (t >= 1) {
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
    const t = Math.min(elapsed / duration, 1);
    mesh.position.y = startY - depth * t;
    mesh.scale.setScalar(Math.max(0.1, 1 - 0.6 * t));
    if (t >= 1) {
      mesh.visible = false;
      alive = false;
    }
  }

  return { update, get alive() { return alive; } };
}
