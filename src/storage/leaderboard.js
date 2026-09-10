// localStorage-backed leaderboard + last-used name. Every read tolerates
// missing/corrupt JSON (private browsing, a hand-edited value, storage
// disabled) by falling back to an empty/default value rather than
// throwing — the game should still be playable even if nothing persists.

const LEADERBOARD_KEY = 'parabolapult:leaderboard';
const LAST_NAME_KEY = 'parabolapult:lastName';
const MAX_ENTRIES = 20;

function isValidEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.name === 'string' &&
    typeof entry.score === 'number' &&
    Number.isFinite(entry.score)
  );
}

/** @returns {Array<{name: string, score: number, difficulty: string, date: string, rounds: number}>} */
export function getEntries() {
  let raw;
  try {
    raw = localStorage.getItem(LEADERBOARD_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isValidEntry).sort((a, b) => b.score - a.score);
}

/**
 * Adds an entry and returns the updated, sorted, capped leaderboard.
 * @param {{ name: string, score: number, difficulty: string, date: string, rounds: number }} entry
 */
export function addEntry(entry) {
  const entries = getEntries();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full/unavailable — the round still counts, it just won't persist.
  }

  return trimmed;
}

export function getLastName() {
  try {
    return localStorage.getItem(LAST_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setLastName(name) {
  try {
    localStorage.setItem(LAST_NAME_KEY, name);
  } catch {
    // Ignore — non-critical.
  }
}

export function clearAll() {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
    localStorage.removeItem(LAST_NAME_KEY);
  } catch {
    // Ignore — non-critical.
  }
}
