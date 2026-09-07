import { createBackdrop } from './backdrop.js';
import { createRuler } from './ruler.js';
import { createLauncher } from './launcher.js';
import { createTarget } from './target.js';

const DEFAULT_TARGET_MARKER = 12;

export function buildWorld(scene) {
  scene.add(createBackdrop());

  const ruler = createRuler();
  scene.add(ruler);

  const { group: launcherGroup, muzzle } = createLauncher();
  scene.add(launcherGroup);
  const launcher = { group: launcherGroup, muzzle };

  const { group: targetGroup, setMarker } = createTarget();
  scene.add(targetGroup);
  setMarker(DEFAULT_TARGET_MARKER);
  const target = { group: targetGroup, setMarker };

  return { ruler, launcher, target };
}
