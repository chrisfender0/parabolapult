// WebAudio-generated sound effects — no audio files. Every sound is a
// short oscillator/noise burst routed through one master gain, so mute is
// a single gain node flip rather than tracking N active sources. The
// AudioContext itself is created lazily on the first play*() call (browsers
// refuse to start one before a user gesture, and every play*() call here
// is already the result of one — Launch clicks, hit/crash landings).
//
// If AudioContext isn't available at all (very old browser, or the
// constructor throws), every play*() below just no-ops.

const MUTE_KEY = 'parabolapult:muted';

let audioCtx = null;
let masterGain = null;
let muted = loadMuted();

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistMuted(value) {
  try {
    if (value) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // Non-critical — mute just won't survive a reload.
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  persistMuted(muted);
  if (masterGain) masterGain.gain.value = muted ? 0 : 1;
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

function ensureContext() {
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

function now() {
  return audioCtx.currentTime;
}

// A short attack/decay envelope gain node — every sound below runs its
// oscillator/noise straight through one of these instead of hand-rolling
// setValueAtTime/exponentialRamp pairs each time.
function envelope(duration, peak) {
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now());
  gain.gain.exponentialRampToValueAtTime(peak, now() + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now() + duration);
  return gain;
}

/** Launch whoosh — a falling sawtooth sweep. */
export function playLaunch() {
  const ctx = ensureContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now());
  osc.frequency.exponentialRampToValueAtTime(55, now() + 0.35);

  const gain = envelope(0.4, 0.18);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(now() + 0.4);
}

/** Hit chime — a quick ascending three-note sine arpeggio. */
export function playHit() {
  const ctx = ensureContext();
  if (!ctx) return;

  [660, 880, 1100].forEach((freq, i) => {
    const start = now() + i * 0.06;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);

    osc.connect(gain).connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.32);
  });
}

/** Crash thud — filtered noise burst. */
export function playCrash() {
  const ctx = ensureContext();
  if (!ctx) return;

  const bufferSize = Math.floor(ctx.sampleRate * 0.3);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 450;

  const gain = envelope(0.3, 0.35);
  noise.connect(filter).connect(gain).connect(masterGain);
  noise.start();
}

/** A single short tick — the hard-mode timer's final-seconds countdown. */
export function playTick() {
  const ctx = ensureContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1000, now());

  const gain = envelope(0.08, 0.1);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(now() + 0.08);
}
