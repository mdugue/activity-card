/**
 * Clamp a raw query value to a bounded positive integer. Non-numeric or
 * missing input falls back; out-of-range input clamps. Keeps user-supplied
 * strings out of upstream Strava URLs.
 */
export function clampedIntParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}
