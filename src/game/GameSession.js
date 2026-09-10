// Plain data for one playthrough. GameController owns all the lifecycle
// logic and mutates these fields directly — this class is just the shape.
export class GameSession {
  constructor({ difficulty, playerName }) {
    this.difficulty = difficulty;
    this.playerName = playerName;
    this.round = 0;
    this.score = 0;
    this.triesRemaining = 0;
    this.streak = 0; // consecutive first-try hits; GameController resets it on any miss
    this.history = []; // one entry per try (every landing, hit or miss)
    this.rounds = []; // one entry per completed round, for the results breakdown
  }
}
