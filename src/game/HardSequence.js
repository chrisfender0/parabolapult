import { Emitter } from '../utils/Emitter.js';
import { makeMediumSmall, checkAnswer } from '../math/equations.js';

export const STEP_DURATION = 15; // seconds per equation
// Color ids only — style.css owns the actual amber/cyan/magenta values
// (--color-hard-1/2/3) and the ①②③ badge is assigned in display order.
export const STEP_COLORS = ['hard-1', 'hard-2', 'hard-3'];

/**
 * The first half of hard mode: three timed, color-coded equations shown
 * one at a time. The player's answers are recorded privately — nothing
 * emitted here ever reveals whether an answer was right, and the round
 * never gets "no" or "yes" feedback for these.
 *
 * Timing is driven entirely by update(dt) from the main render loop
 * (not setInterval), so a step's countdown is frame-accurate and survives
 * a backgrounded tab via the loop's clamped delta. A step that reaches
 * 0 auto-submits whatever is currently typed (via setPendingValue) —
 * same as the player answering manually.
 *
 * Events: hard:step, hard:sequenceComplete.
 */
export class HardSequence extends Emitter {
  constructor(rng) {
    super();
    this.rng = rng;
    this.steps = [];
    this.index = -1;
    this.timeLeft = 0;
    this.timeLeftTotal = 0;
    this.running = false;
    this._pendingValue = '';
  }

  start() {
    this.steps = STEP_COLORS.map((color, i) => ({
      equation: makeMediumSmall(this.rng),
      color,
      badge: i + 1,
      playerAnswer: null,
      timeLeft: 0,
    }));
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
    const { parsed } = checkAnswer(step.equation, rawValue ?? '');
    step.playerAnswer = parsed;
    step.timeLeft = this.timeLeft;
    this.timeLeftTotal += this.timeLeft;

    this.index += 1;
    this._pendingValue = '';

    if (this.index >= this.steps.length) {
      this.running = false;
      this.emit('hard:sequenceComplete', {
        steps: this.steps.map(({ equation, playerAnswer, timeLeft }) => ({ equation, playerAnswer, timeLeft })),
        timeLeftTotal: this.timeLeftTotal,
      });
      return;
    }

    this.timeLeft = STEP_DURATION;
    this._emitStep();
  }

  _emitStep() {
    const step = this.steps[this.index];
    // Deliberately omits step.equation.answer — the emitted payload never
    // carries anything that could reveal correctness.
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
