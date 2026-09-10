// Compares where a flown trajectory actually landed against the target's
// marker and reports a hit/miss outcome.
//
// Takes the target's marker number directly rather than the target object
// itself: world/target.js doesn't expose its current marker anywhere yet
// (setMarker only moves it), and threading that through is out of scope
// for this session — see plan/04-projectile-flight.md's "Files touched".
// The caller (main.js's dev hook today, GameController from session 6 on)
// is expected to track the marker itself.
export function resolveOutcome(trajectory, targetMarker) {
  const landedAt = Math.round(trajectory.landingX);
  const outcome = !trajectory.isNull && landedAt === targetMarker ? 'hit' : 'miss';
  return { outcome, landedAt, targetAt: targetMarker };
}
