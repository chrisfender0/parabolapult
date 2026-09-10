import { Emitter } from '../utils/Emitter.js';
import { createRng } from '../utils/rng.js';
import { makeEasy, makeMedium, checkAnswer } from '../math/equations.js';
import { makeTrajectory } from '../math/trajectory.js';
import { resolveOutcome } from './flightOutcome.js';
import { GameSession } from './GameSession.js';

const MAX_TRIES = 3;

// 'hard' is intentionally absent — it needs the timed multi-equation flow
// from sessions 10/10.1, not a single generator call.
const GENERATORS = {
  easy: makeEasy,
  medium: makeMedium,
};

/**
 * Runs a round: generate an equation, place the target, take an answer,
 * launch, resolve the outcome, spend a try, end the round. No UI — driven
 * entirely by method calls and Emitter events.
 *
 * Events: round:begin, try:hit, try:miss, round:won, round:lost, game:over.
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

    const generate = GENERATORS[this.session.difficulty];
    if (!generate) {
      throw new Error(`no equation generator for difficulty "${this.session.difficulty}"`);
    }

    this.equation = generate(this.rng);
    this.targetMarker = this.equation.answer;
    this.target.setMarker(this.targetMarker);

    this.session.round += 1;
    this.session.triesRemaining = MAX_TRIES;
    this.roundOver = false;

    this.emit('round:begin', {
      equation: this.equation,
      targetMarker: this.targetMarker,
      round: this.session.round,
      triesRemaining: this.session.triesRemaining,
    });
  }

  submit(input) {
    if (!this.session || this.roundOver || this.flying) return;

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
      this.roundOver = true;
      this.emit('try:hit', {
        landedAt: result.landedAt,
        targetAt: result.targetAt,
        triesRemaining: this.session.triesRemaining,
      });
      this.emit('round:won', { session: this.session });
      return;
    }

    this.session.triesRemaining -= 1;
    this.emit('try:miss', {
      landedAt: result.landedAt,
      targetAt: result.targetAt,
      triesRemaining: this.session.triesRemaining,
    });

    if (this.session.triesRemaining <= 0) {
      this.roundOver = true;
      this.emit('round:lost', { session: this.session });
    }
  }

  nextRound() {
    if (!this.session) return;
    this.beginRound();
  }

  endGame() {
    if (!this.session) return;
    this.emit('game:over', { session: this.session });
    this.session = null;
  }
}
