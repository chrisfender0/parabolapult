// Pure scoring math — no game/session state, just the formula. Given the
// facts of one resolved round, returns the points earned and an itemized
// breakdown the results screen can render line by line.

export const BASE_HIT_POINTS = 100;

// Indexed by 0-based try number: hit on the 1st/2nd/3rd try.
export const TRY_BONUS = [50, 20, 0];

export const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2.5 };

// Consecutive first-try hits stack: 1st in a row +25, 2nd +50, 3rd +75...
export const STREAK_BONUS_STEP = 25;

/**
 * @param {{
 *   hit: boolean,
 *   tryIndex?: number,       // 0-based try the hit landed on; ignored on a miss
 *   difficulty: 'easy' | 'medium' | 'hard',
 *   streak: number,          // consecutive first-try hits *before* this round
 *   speedBonus?: number,     // hard mode only (session 10) — 0 elsewhere
 * }} params
 * @returns {{ points: number, breakdown: object }}
 */
export function scoreRound({ hit, tryIndex, difficulty, streak, speedBonus = 0 }) {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;

  // A lost round (all 3 tries missed) scores zero — see plan/09's design
  // note: rounds exhausted ends the game, a single bad round doesn't.
  if (!hit) {
    const breakdown = {
      base: 0,
      tryBonus: 0,
      streakBonus: 0,
      speedBonus: 0,
      multiplier,
      subtotal: 0,
      points: 0,
    };
    return { points: 0, breakdown };
  }

  const isFirstTry = tryIndex === 0;
  const base = BASE_HIT_POINTS;
  const tryBonus = TRY_BONUS[tryIndex] ?? 0;
  // Only first-try hits extend the streak; the bonus reflects the streak
  // length *including* this hit.
  const streakBonus = isFirstTry ? (streak + 1) * STREAK_BONUS_STEP : 0;
  const subtotal = base + tryBonus + streakBonus + speedBonus;
  const points = Math.round(subtotal * multiplier);

  return {
    points,
    breakdown: { base, tryBonus, streakBonus, speedBonus, multiplier, subtotal, points },
  };
}
