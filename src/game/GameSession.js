// Plain data for one playthrough. GameController owns all the lifecycle
// logic and mutates these fields directly — this class is just the shape.
export class GameSession {
  constructor({ difficulty, playerName }) {
    this.difficulty = difficulty;
    this.playerName = playerName;
    this.round = 0;
    this.score = 0;
    this.triesRemaining = 0;
    this.history = [];
  }
}
