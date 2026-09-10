// localStorage-backed leaderboard + last-used name. Every read tolerates
// missing/corrupt JSON (private browsing, a hand-edited value, storage
// disabled) by falling back to an empty/default value rather than
// throwing — the game should still be playable even if nothing persists.

const KEY_PREFIX = 'parabolapult:';
const LEADERBOARD_KEY = `${KEY_PREFIX}leaderboard`;
const LAST_NAME_KEY = `${KEY_PREFIX}lastName`;
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

/**
 * 1-based rank of `entry` within `entries` (as returned by addEntry/getEntries),
 * found by reference — pass the exact object you gave addEntry. Null if it
 * isn't present (e.g. it fell off the end past MAX_ENTRIES).
 */
export function getRank(entries, entry) {
  const index = entries.indexOf(entry);
  return index === -1 ? null : index + 1;
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

function storedKeys() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

/** True if any parabolapult: key has ever been written — controls whether "Reset Data" shows at all. */
export function hasStoredData() {
  return storedKeys().length > 0;
}

/** Removes every parabolapult:* key, not just the leaderboard/name — a full wipe. */
export function clearAll() {
  try {
    for (const key of storedKeys()) localStorage.removeItem(key);
  } catch {
    // Ignore — non-critical.
  }
}
