/**
 * Is a request / cookie / env value set to something non-empty? Absent
 * (`null` / `undefined`) and blank (`""`) both read as "not provided".
 */
export const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== "";

const LEADING_INT = /^\s*(?<digits>[+-]?\d+)/u;

/**
 * Read `raw` exactly like `Number.parseInt(raw, 10)`: optional leading
 * whitespace and sign, then the leading decimal digits; `NaN` when there are
 * none.
 */
export const leadingInt = (raw: string): number => {
  const digits = LEADING_INT.exec(raw)?.groups?.digits;
  return digits === undefined ? Number.NaN : Number(digits);
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
