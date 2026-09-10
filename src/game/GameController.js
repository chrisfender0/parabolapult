import { Emitter } from '../utils/Emitter.js';
import { createRng } from '../utils/rng.js';
import { makeEasy, makeMedium, checkAnswer } from '../math/equations.js';
import { makeTrajectory } from '../math/trajectory.js';
import { resolveOutcome } from './flightOutcome.js';
import { scoreRound } from './scoring.js';
import { GameSession } from './GameSession.js';
import { HardSequence, TOTAL_STEP_TIME } from './HardSequence.js';

const MAX_TRIES = 3;
export const ROUNDS_PER_GAME = 5;
const HARD_SPEED_BONUS_MAX = 60;
const HARD_FINAL_DURATION = 15; // seconds — the final equation is timed too

// 'hard' is intentionally absent — beginRound() branches to the timed
// HardSequence for it instead of a single generator call.
const GENERATORS = {
  easy: makeEasy,
  medium: makeMedium,
};

/**
 * Runs a round: generate an equation, place the target, take an answer,
 * launch, resolve the outcome, spend a try, end the round. No UI — driven
 * entirely by method calls and Emitter events.
 *
 * Hard mode instead runs a HardSequence first (three timed equations,
 * each of which must be answered correctly or the attempt fails outright
 * — see game/HardSequence.js), then a real, still-timed final equation
 * built from their correct answers.
 *
 * Events: round:begin, hard:step, hard:miniMiss, hard:sequenceComplete,
 * try:hit, try:miss, round:scored, round:won, round:lost, game:over.
 */
export class GameController extends Emitter {
  constructor({ projectile, target, rng = createRng() }) {
    super();
    this.projectile = projectile;
    this.target = target;
    this.rng = rng;

    this.session = null;
    this.equation = null;
    this.targetMarker = null;
    this.flying = false;
    this.roundOver = false;
    this.hardSequence = null;
    this.hardFinal = null;
    this.hardTrueValues = null; // the actual correct r1/r2/r3 — for the results reveal only
    this.hardPhase = null; // 'recall' | 'solve' | null
    this.hardRecallValues = null; // what they typed for the 3 numbers this attempt
    this.hardRecallPending = ['', '', ''];
    this.hardRecallTimeLeft = 0;
    this.hardSolvePending = '';
    this.hardSolveTimeLeft = 0;
    this.hardTypedFinal = null;

    this.projectile.on('land', (payload) => this._handleLand(payload));
  }

  start({ difficulty, playerName }) {
    this.session = new GameSession({ difficulty, playerName });
    this.beginRound();
  }

  // Same equation and target across all 3 tries within a round — the
  // player is retrying the same problem, not getting a new one.
  beginRound() {
    if (!this.session) throw new Error('call start() before beginRound()');

    this.session.round += 1;
    this.session.triesRemaining = MAX_TRIES;
    this.roundOver = false;

    if (this.session.difficulty === 'hard') {
      this._beginHardRound();
      return;
    }

    const generate = GENERATORS[this.session.difficulty];
    if (!generate) {
      throw new Error(`no equation generator for difficulty "${this.session.difficulty}"`);
    }

    this.equation = generate(this.rng);
    this.targetMarker = this.equation.answer;
    this.target.setMarker(this.targetMarker);

    this.emit('round:begin', {
      difficulty: this.session.difficulty,
      equation: this.equation,
      targetMarker: this.targetMarker,
      round: this.session.round,
      totalRounds: ROUNDS_PER_GAME,
      triesRemaining: this.session.triesRemaining,
      score: this.session.score,
    });
  }

  // Starts (or restarts, after a failed attempt) the timed sequence of
  // three equations. The world stays idle — nothing launches until all
  // three are answered correctly and the final combined equation (see
  // _handleHardSequenceComplete) sets a real target and takes over submit().
  _beginHardRound() {
    this.hardFinal = null;
    this.hardTrueValues = null;
    this.hardPhase = null;
    this.hardRecallValues = null;
    this.hardTypedFinal = null;

    this.emit('round:begin', {
      difficulty: 'hard',
      round: this.session.round,
      totalRounds: ROUNDS_PER_GAME,
      triesRemaining: this.session.triesRemaining,
      score: this.session.score,
    });

    this.hardSequence = new HardSequence(this.rng);
    this.hardSequence.on('hard:step', (payload) => this.emit('hard:step', payload));
    this.hardSequence.on('hard:attemptFailed', (payload) => this._handleHardAttemptFailed(payload));
    this.hardSequence.on('hard:sequenceComplete', (payload) => this._handleHardSequenceComplete(payload));
    this.hardSequence.start();
  }

  // A wrong (or timed-out) answer on any of the three equations fails
  // the whole attempt immediately — burns a try, same as a bad launch
  // anywhere else. With tries left, the *same* three equations replay
  // from the top; out of tries ends the round as a loss.
  _handleHardAttemptFailed(payload) {
    this.session.streak = 0;
    this.session.triesRemaining -= 1;

    this.emit('hard:miniMiss', { ...payload, triesRemaining: this.session.triesRemaining });

    if (this.session.triesRemaining <= 0) {
      this._concludeHardRoundBeforeFinal(payload);
      this.roundOver = true;
      this.emit('round:lost', { session: this.session });
      return;
    }

    this.hardSequence.retry();
  }

  // The three equations are done — the target is set now (from their
  // correct answers, computed up front by HardSequence.start(), see
  // buildFinal), but nothing about it is shown. The player still has to
  // recall the three numbers themselves before anything is displayed.
  _handleHardSequenceComplete(payload) {
    this.hardFinal = this.hardSequence.final;
    this.hardTrueValues = payload.values;
    this.targetMarker = this.hardFinal.value;
    this.target.setMarker(this.targetMarker);

    // Just for console verification (the plan's "Done when" check) —
    // no UI reacts to this; hard:recall (emitted next) is what renders.
    this.emit('hard:sequenceComplete', { timeLeftTotal: payload.timeLeftTotal });

    this._beginHardRecall();
  }

  // First half of the final phase: three blank, badged/colored inputs —
  // the player has to type back the numbers from the equations they just
  // solved, with only the operators shown. Nothing here is checked for
  // correctness; whatever they type becomes *their* equation in the next
  // phase, right or wrong.
  _beginHardRecall() {
    this.hardPhase = 'recall';
    this.hardRecallValues = null;
    this.hardRecallPending = ['', '', ''];
    this.hardRecallTimeLeft = HARD_FINAL_DURATION;

    this.emit('hard:recall', {
      ops: this.hardFinal.ops,
      steps: this.hardSequence.steps.map(({ color, badge }) => ({ color, badge })),
      duration: HARD_FINAL_DURATION,
      // Only meaningful for the HUD's debug-mode target readout.
      targetMarker: this.targetMarker,
    });
  }

  /** HUD calls this on every keystroke in a recall input, so a timeout has something to submit. */
  setHardRecallPendingValue(index, value) {
    if (this.hardRecallPending) this.hardRecallPending[index] = value;
  }

  /** HUD calls this once all three recall inputs are filled (or the timer runs out). */
  submitHardRecall(values) {
    if (!this.session || this.roundOver || this.flying) return;
    if (this.session.difficulty !== 'hard' || this.hardPhase !== 'recall') return;

    this.hardRecallValues = values.map((raw) => {
      const trimmed = String(raw ?? '').trim();
      return /^-?\d+$/.test(trimmed) ? Number(trimmed) : 0; // blank/invalid still needs a real number to build the equation from
    });

    this._beginHardSolve();
  }

  // Second half: the equation now shows *their* recalled numbers (right
  // or wrong) with the operators, and they have to actually work out and
  // type the result themselves — that typed result is the launch distance.
  _beginHardSolve() {
    this.hardPhase = 'solve';
    this.hardSolvePending = '';
    this.hardSolveTimeLeft = HARD_FINAL_DURATION;

    this.emit('hard:solve', {
      values: this.hardRecallValues,
      ops: this.hardFinal.ops,
      steps: this.hardSequence.steps.map(({ color, badge }) => ({ color, badge })),
      duration: HARD_FINAL_DURATION,
    });
  }

  /** HUD calls this on every keystroke in the solve input, so a timeout has something to submit. */
  setHardSolvePendingValue(value) {
    this.hardSolvePending = value;
  }

  /**
   * Hard mode's launch — the result the player computed for *their own*
   * recalled equation, same trajectory/scoring path as a normal
   * single-answer submit. Wrong recall, wrong arithmetic, or both — any
   * of it flies to the wrong marker exactly like a wrong answer would
   * anywhere else.
   */
  submitHardFinal(value) {
    if (!this.session || this.roundOver || this.flying) return;
    if (this.session.difficulty !== 'hard' || this.hardPhase !== 'solve') return;

    const trimmed = String(value ?? '').trim();
    const parsed = /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;

    this.hardTypedFinal = parsed;
    // An invalid/blank value (e.g. a timeout with nothing typed) still
    // needs to visibly fail — 0 fizzles the same way NaN would (both are
    // <= 0 / non-finite to makeTrajectory) but reads cleanly as "landed
    // at 0" rather than "landed at NaN".
    const landingX = parsed ?? 0;

    this.flying = true;
    this.projectile.launch(makeTrajectory(landingX));
  }

  /** Ticked every frame by the screen while a hard round is running. */
  updateHard(dt) {
    this.hardSequence?.update(dt);

    if (this.hardPhase === 'recall' && !this.roundOver) {
      this.hardRecallTimeLeft = Math.max(0, this.hardRecallTimeLeft - dt);
      if (this.hardRecallTimeLeft <= 0) this.submitHardRecall(this.hardRecallPending);
    } else if (this.hardPhase === 'solve' && !this.roundOver && !this.flying) {
      this.hardSolveTimeLeft = Math.max(0, this.hardSolveTimeLeft - dt);
      if (this.hardSolveTimeLeft <= 0) this.submitHardFinal(this.hardSolvePending);
    }
  }

  /** HUD calls this on every keystroke during a hard step, so a timeout has something to submit. */
  setHardPendingValue(value) {
    this.hardSequence?.setPendingValue(value);
  }

  /** HUD calls this when the player answers a hard step before its timer runs out. */
  submitHardStep(value) {
    this.hardSequence?.submit(value);
  }

  submit(input) {
    if (!this.session || this.roundOver || this.flying) return;
    if (this.session.difficulty === 'hard') return; // hard mode answers via submitHardStep()

    const { parsed } = checkAnswer(this.equation, input);
    if (parsed === null) return; // not a number — nothing to launch

    this.flying = true;
    // Trajectory is built from what the player typed, not the correct
    // answer — a wrong number must visibly fly to the wrong place.
    this.projectile.launch(makeTrajectory(parsed));
  }

  _handleLand({ trajectory }) {
    this.flying = false;
    if (!this.session || this.roundOver) return;

    const result = resolveOutcome(trajectory, this.targetMarker);
    this.session.history.push({
      round: this.session.round,
      landedAt: result.landedAt,
      targetAt: result.targetAt,
      outcome: result.outcome,
    });

    if (result.outcome === 'hit') {
      // triesRemaining is untouched by a hit, so it still reflects tries
      // left *before* this attempt — e.g. 3 left means this was try 1.
      const tryIndex = MAX_TRIES - this.session.triesRemaining;
      this._concludeRound({ hit: true, tryIndex, result });

      this.roundOver = true;
      this.emit('try:hit', {
        landedAt: result.landedAt,
        targetAt: result.targetAt,
        triesRemaining: this.session.triesRemaining,
      });
      this.emit('round:won', { session: this.session });
      return;
    }

    // Any miss breaks a streak, even one that still has retries left —
    // this round is no longer a first-try hit either way.
    this.session.streak = 0;

    this.session.triesRemaining -= 1;

    this.emit('try:miss', {
      landedAt: result.landedAt,
      targetAt: result.targetAt,
      triesRemaining: this.session.triesRemaining,
    });

    // A hard-mode retry replays the whole final phase — recall the three
    // numbers again, then solve again. A wrong launch could mean they
    // misremembered a number, so they get a real second look at it.
    if (this.session.difficulty === 'hard' && this.hardFinal && this.session.triesRemaining > 0) {
      this._beginHardRecall();
    }

    if (this.session.triesRemaining <= 0) {
      this._concludeRound({ hit: false, tryIndex: MAX_TRIES - 1, result });

      this.roundOver = true;
      this.emit('round:lost', { session: this.session });
    }
  }

  // Scores the round exactly once, at the point it actually concludes
  // (a hit, or the final miss) — not on intermediate misses that still
  // have retries left.
  _concludeRound({ hit, tryIndex, result }) {
    const isHard = this.session.difficulty === 'hard';
    // Scaled linearly against the 45s (3 x 15s) total across the timed
    // equations; scoreRound zeroes this out on its own for a lost round.
    const speedBonus = isHard
      ? Math.round((this.hardSequence.timeLeftTotal / TOTAL_STEP_TIME) * HARD_SPEED_BONUS_MAX)
      : 0;

    const { points, breakdown } = scoreRound({
      hit,
      tryIndex,
      difficulty: this.session.difficulty,
      streak: this.session.streak,
      speedBonus,
    });

    this.session.score += points;
    this.session.streak = hit && tryIndex === 0 ? this.session.streak + 1 : 0;

    const roundSummary = {
      round: this.session.round,
      yourAnswer: result.landedAt,
      target: result.targetAt,
      triesUsed: tryIndex + 1,
      outcome: hit ? 'hit' : 'miss',
      points,
      breakdown,
    };

    if (isHard) {
      // The reveal the player was denied during play — what they typed
      // for the three numbers vs. what they actually were, and what they
      // computed for their own equation vs. the true combined value —
      // surfaces only now, for the results screen.
      roundSummary.hard = {
        trueValues: this.hardTrueValues,
        recallValues: this.hardRecallValues,
        ops: this.hardFinal.ops,
        steps: this.hardSequence.steps.map(({ color, badge }) => ({ color, badge })),
        correct: this.hardFinal.value,
        typed: this.hardTypedFinal,
      };
    } else {
      roundSummary.equation = this.equation.prompt;
    }

    this.session.rounds.push(roundSummary);

    this.emit('round:scored', {
      round: this.session.round,
      points,
      breakdown,
      totalScore: this.session.score,
    });
  }

  // A hard round can also end before ever reaching the final equation —
  // three failed attempts at the memorized equations. Still scores (as
  // a loss, i.e. zero points) and still leaves a reveal for the results
  // screen: the last attempt's equations, what was typed, and which one
  // broke it.
  _concludeHardRoundBeforeFinal(failPayload) {
    const { points, breakdown } = scoreRound({
      hit: false,
      tryIndex: MAX_TRIES - 1,
      difficulty: 'hard',
      streak: this.session.streak,
    });

    this.session.score += points;

    this.session.rounds.push({
      round: this.session.round,
      yourAnswer: null,
      target: this.hardSequence.final.value,
      triesUsed: MAX_TRIES,
      outcome: 'miss',
      points,
      breakdown,
      hard: {
        failedStep: { color: failPayload.color, badge: failPayload.badge },
        steps: this.hardSequence.steps.map(({ equation, playerAnswer, color, badge }) => ({
          color,
          badge,
          prompt: equation.prompt,
          correct: equation.answer,
          typed: playerAnswer,
        })),
      },
    });

    this.emit('round:scored', {
      round: this.session.round,
      points,
      breakdown,
      totalScore: this.session.score,
    });
  }

  // Called after a round concludes (win or loss) to advance — either into
  // a fresh round, or into endGame() once ROUNDS_PER_GAME is reached.
  nextRound() {
    if (!this.session) return;
    if (this.session.round >= ROUNDS_PER_GAME) {
      this.endGame();
      return;
    }
    this.beginRound();
  }

  endGame() {
    if (!this.session) return;
    this.emit('game:over', { session: this.session });
    this.session = null;
  }
}
