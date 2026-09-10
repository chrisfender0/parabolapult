import { createIdleCameraDrift } from '../core/idleCameraDrift.js';

// Shared by Landing and Setup: keeps the persistent 3D scene gently
// drifting behind the menu overlay instead of sitting frozen.
export function mountIdleScene(ctx) {
  const drift = createIdleCameraDrift(ctx.camera);
  const removeUpdater = ctx.addUpdater(drift.update);

  return function unmountIdleScene() {
    removeUpdater();
    drift.stop();
  };
}
