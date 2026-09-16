import { prefersReducedMotion } from '../utils/motion.js';

// A brief time-dilation beat for hit celebrations — dips the render loop's
// effective dt to `scale` for `holdMs`, then eases back to 1x over
// `recoverMs`. update(dt) is fed the *real* rAF delta every frame (so its
// own timers never distort themselves) and returns the multiplier to apply
// to that frame's dt before handing it to the game's updaters.
export function createSlowMo() {
  let phase = 'idle'; // 'idle' | 'hold' | 'recover'
  let elapsed = 0;
  let holdMs = 0;
  let recoverMs = 0;
  let dipScale = 1;

  function trigger({ scale = 0.25, hold = 90, recover = 220 } = {}) {
    if (prefersReducedMotion()) return;
    phase = 'hold';
    elapsed = 0;
    dipScale = scale;
    holdMs = hold;
    recoverMs = recover;
  }

  function update(realDt) {
    if (phase === 'idle') return 1;

    elapsed += realDt * 1000;

    if (phase === 'hold') {
      if (elapsed >= holdMs) {
        phase = 'recover';
        elapsed = 0;
      }
      return dipScale;
    }

    // 'recover': ease the multiplier from dipScale back to 1.
    const t = Math.min(elapsed / recoverMs, 1);
    if (t >= 1) {
      phase = 'idle';
      return 1;
    }
    return dipScale + (1 - dipScale) * t;
  }

  return { trigger, update };
}
