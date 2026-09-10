import { Emitter } from '../utils/Emitter.js';
import { makeMediumSmall, checkAnswer, PLAYABLE_MIN, PLAYABLE_MAX } from '../math/equations.js';

export const STEP_DURATION = 15; // seconds per equation
export const TOTAL_STEP_TIME = STEP_DURATION * 3; // for scoring's speed-bonus scaling
// Color ids only — style.css owns the actual amber/cyan/magenta values
// (--color-hard-1/2/3) and the ①②③ badge is assigned in display order.
export const STEP_COLORS = ['hard-1', 'hard-2', 'hard-3'];

const FINAL_OPS = ['+', '-', '×'];
const MAX_FINAL_REGEN_ATTEMPTS = 60;

function evaluateFinal(values, ops) {
  let value = values[0];
  for (let i = 0; i < ops.length; i += 1) {
    const rhs = values[i + 1];
    if (ops[i] === '+') value += rhs;
    else if (ops[i] === '-') value -= rhs;
    else value *= rhs; // '×'
  }
  return value;
}

/**
 * Builds the final round's combined expression from the three timed
 * equations' correct answers: r1 op1 r2 op2 r3, evaluated strictly left
 * to right (no operator precedence). The result is guaranteed to land in
 * the playable range — returns null if no operator pair works for these
 * particular r-values (the caller should regenerate the third equation
 * and try again, before the player has seen anything).
 */
export function buildFinal(r1, r2, r3, rng) {
  const candidates = [];
  for (const op1 of FINAL_OPS) {
    for (const op2 of FINAL_OPS) {
      const value = evaluateFinal([r1, r2, r3], [op1, op2]);
      if (value >= PLAYABLE_MIN && value <= PLAYABLE_MAX) {
        candidates.push({ ops: [op1, op2], value });
      }
    }
  }
  if (candidates.length === 0) return null;

  const chosen = rng.pick(candidates);
  return {
    ops: chosen.ops,
    value: chosen.value,
    evaluate: (values) => evaluateFinal(values, chosen.ops),
  };
}

/**
 * Hard mode's three timed, color-coded equations. Unlike easy/medium,
 * a wrong (or timed-out) answer fails the attempt immediately — the
 * player has to actually get all three right, not just eventually land
 * on the right combined number. Getting all three right reveals the
 * final equation (built from the correct answers, operators drawn up
 * front — see buildFinal) for GameController to run as a real,
 * launchable, still-timed equation.
 *
 * retry() replays the *same* three equations from the top after a
 * failed attempt — matching every other difficulty's "same problem, try
 * again" convention. The final equation, once computed, never changes
 * for the round regardless of retries.
 *
 * Timing is driven entirely by update(dt) from the main render loop
 * (not setInterval), so a step's countdown is frame-accurate and survives
 * a backgrounded tab via the loop's clamped delta. A step that reaches
 * 0 auto-submits whatever is currently typed (via setPendingValue) —
 * same as the player answering manually, and just as failable.
 *
 * Events: hard:step, hard:attemptFailed, hard:sequenceComplete.
 */
export class HardSequence extends Emitter {
  constructor(rng) {
    super();
    this.rng = rng;
    this.steps = [];
    this.final = null;
    this.index = -1;
    this.timeLeft = 0;
    this.timeLeftTotal = 0;
    this.running = false;
    this._pendingValue = '';
  }

  start() {
    let steps;
    let final = null;

    for (let attempt = 0; attempt < MAX_FINAL_REGEN_ATTEMPTS && !final; attempt += 1) {
      if (attempt === 0) {
        steps = STEP_COLORS.map((color, i) => ({
          equation: makeMediumSmall(this.rng),
          color,
          badge: i + 1,
          playerAnswer: null,
          timeLeft: 0,
        }));
      } else {
        // Only the third equation regenerates — the first two stay as drawn.
        steps[2] = { ...steps[2], equation: makeMediumSmall(this.rng) };
      }
      const [r1, r2, r3] = steps.map((step) => step.equation.answer);
      final = buildFinal(r1, r2, r3, this.rng);
    }

    if (!final) {
      // Vanishingly unlikely given the range, but fail loudly rather than
      // silently starting a round with no valid target.
      throw new Error(`could not build a valid hard-mode final equation after ${MAX_FINAL_REGEN_ATTEMPTS} attempts`);
    }

    this.steps = steps;
    this.final = final;
    this._beginAttempt();
  }

  /** Replays the same three equations from the top — call after a failed attempt. */
  retry() {
    for (const step of this.steps) {
      step.playerAnswer = null;
      step.timeLeft = 0;
    }
    this._beginAttempt();
  }

  _beginAttempt() {
    this.index = 0;
    this.timeLeft = STEP_DURATION;
    this.timeLeftTotal = 0;
    this.running = true;
    this._pendingValue = '';
    this._emitStep();
  }

  /** The HUD calls this on every keystroke, so a timeout has something to submit. */
  setPendingValue(rawValue) {
    this._pendingValue = rawValue;
  }

  /** Advance the countdown by dt seconds; a step that hits 0 auto-submits. */
  update(dt) {
    if (!this.running) return;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) {
      this._advance(this._pendingValue);
    }
  }

  /** The HUD calls this when the player answers before time runs out. */
  submit(rawValue) {
    if (!this.running) return;
    this._advance(rawValue);
  }

  _advance(rawValue) {
    const step = this.steps[this.index];
    const { correct, parsed } = checkAnswer(step.equation, rawValue ?? '');
    step.playerAnswer = parsed;
    step.timeLeft = this.timeLeft;
    this.timeLeftTotal += this.timeLeft;

    if (!correct) {
      this.running = false;
      this.emit('hard:attemptFailed', { index: this.index, color: step.color, badge: step.badge });
      return;
    }

    this.index += 1;

    if (this.index >= this.steps.length) {
      this.running = false;
      const values = this.steps.map((s) => s.equation.answer);
      this.emit('hard:sequenceComplete', {
        values,
        ops: this.final.ops,
        steps: this.steps.map(({ color, badge }) => ({ color, badge })),
        timeLeftTotal: this.timeLeftTotal,
      });
      return;
    }

    this.timeLeft = STEP_DURATION;
    this._pendingValue = '';
    this._emitStep();
  }

  _emitStep() {
    const step = this.steps[this.index];
    // Deliberately omits step.equation.answer — the emitted payload never
    // carries anything that could reveal correctness ahead of the check.
    this.emit('hard:step', {
      index: this.index,
      total: this.steps.length,
      color: step.color,
      badge: step.badge,
      duration: STEP_DURATION,
      lhs: step.equation.lhs,
      rhs: step.equation.rhs,
      prompt: step.equation.prompt,
    });
  }
}
