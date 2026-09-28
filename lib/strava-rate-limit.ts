/**
 * Strava enforces a short-window read limit (default 100 requests / 15 min)
 * and a daily one (default 1000 / day). On a breach it returns 429 with the
 * usage exposed via `X-RateLimit-*` headers. We surface this distinctly so
 * the picker can say "slow down" instead of showing a generic upstream error.
 */
export interface StravaRateLimit {
  /** `[short, daily]` limit, parsed from `X-RateLimit-Limit`. */
  limit?: [number, number];
  /** Seconds until the next 15-minute window resets (approximate). */
  retryAfter: number;
  /** `[short, daily]` usage, parsed from `X-RateLimit-Usage`. */
  usage?: [number, number];
}

export class StravaRateLimitError extends Error {
  readonly info: StravaRateLimit;
  constructor(info: StravaRateLimit) {
    super("Strava rate limit exceeded");
    this.name = "StravaRateLimitError";
    this.info = info;
  }
}

const SECONDS = 60;
const QUARTER_HOUR_MIN = 15;

/** Strava's short-window limit resets on the quarter hour. */
const secondsToNextWindow = (): number => {
  const now = new Date();
  const elapsed =
    (now.getMinutes() % QUARTER_HOUR_MIN) * SECONDS + now.getSeconds();
  return QUARTER_HOUR_MIN * SECONDS - elapsed;
};

const parsePair = (header: string | null): [number, number] | undefined => {
  if (header === null || header === "") {
    return undefined;
  }
  const [a, b] = header.split(",").map((n) => Number(n.trim()));
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return [a, b];
  }
  return undefined;
};

/** The rate-limit details of a 429 response. */
export const rateLimitFrom = (res: Response): StravaRateLimit => ({
  limit: parsePair(res.headers.get("x-ratelimit-limit")),
  retryAfter: secondsToNextWindow(),
  usage: parsePair(res.headers.get("x-ratelimit-usage")),
});
