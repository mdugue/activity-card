// No capture group: named groups need an ES2018 target (tsconfig is ES2017),
// and `Number` reads the whole match — whitespace, sign and digits — itself.
const LEADING_INT = /^\s*[+-]?\d+/u;

/**
 * Read `raw` exactly like `Number.parseInt(raw, 10)`: optional leading
 * whitespace and sign, then the leading decimal digits; `NaN` when there are
 * none.
 */
export const leadingInt = (raw: string): number => {
  const match = LEADING_INT.exec(raw);
  return match === null ? Number.NaN : Number(match[0]);
};

/**
 * Clamp a raw query value to a bounded positive integer. Non-numeric or
 * missing input falls back; out-of-range input clamps. Keeps user-supplied
 * strings out of upstream Strava URLs.
 */
export const clampedIntParam = (
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number => {
  const n = leadingInt(raw ?? "");
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
};
