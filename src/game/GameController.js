import { Emitter } from '../utils/Emitter.js';
import { createRng } from '../utils/rng.js';
import { makeEasy, makeMedium, checkAnswer } from '../math/equations.js';
import { makeTrajectory } from '../math/trajectory.js';
import { resolveOutcome } from './flightOutcome.js';
import { scoreRound } from './scoring.js';
import { GameSession } from './GameSession.js';
import { HardSequence } from './HardSequence.js';

const MAX_TRIES = 3;
export const ROUNDS_PER_GAME = 5;

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
 * Hard mode instead runs a HardSequence first (three timed, memorized
 * equations — see game/HardSequence.js); session 10.1 picks up from
 * hard:sequenceComplete to build the final launchable equation.
 *
 * Events: round:begin, hard:step, hard:sequenceComplete, try:hit,
 * try:miss, round:scored, round:won, round:lost, game:over.
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

  // Starts the timed memorization sequence instead of a single equation.
  // The world stays idle — nothing launches until session 10.1's final
  // equation (built from hard:sequenceComplete's recorded answers) sets
  // a target and takes over submit().
  _beginHardRound() {
    this.emit('round:begin', {
      difficulty: 'hard',
      round: this.session.round,
      totalRounds: ROUNDS_PER_GAME,
      triesRemaining: this.session.triesRemaining,
      score: this.session.score,
    });

    this.hardSequence = new HardSequence(this.rng);
    this.hardSequence.on('hard:step', (payload) => this.emit('hard:step', payload));
    this.hardSequence.on('hard:sequenceComplete', (payload) => this.emit('hard:sequenceComplete', payload));
    this.hardSequence.start();
  }

  /** Ticked every frame by the screen while a hard round's sequence is running. */
  updateHard(dt) {
    this.hardSequence?.update(dt);
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
    const { points, breakdown } = scoreRound({
      hit,
      tryIndex,
      difficulty: this.session.difficulty,
      streak: this.session.streak,
    });

    this.session.score += points;
    this.session.streak = hit && tryIndex === 0 ? this.session.streak + 1 : 0;

    this.session.rounds.push({
      round: this.session.round,
      equation: this.equation.prompt,
      yourAnswer: result.landedAt,
      target: result.targetAt,
      triesUsed: tryIndex + 1,
      outcome: hit ? 'hit' : 'miss',
      points,
      breakdown,
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
