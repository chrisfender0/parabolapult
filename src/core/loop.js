// Simple requestAnimationFrame loop that hands registered updaters a
// delta time in seconds, clamped so a backgrounded/tab-switched page
// doesn't report a huge jump when it resumes.
const MAX_DELTA = 0.05;

export function start(callback) {
  let lastTime = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    const rawDelta = (now - lastTime) / 1000;
    lastTime = now;
    const deltaTime = Math.min(rawDelta, MAX_DELTA);

    callback(deltaTime);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return function stop() {
    running = false;
  };
}
