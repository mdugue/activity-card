import { NextResponse } from "next/server";
import {
  clearTokens,
  ensureFreshToken,
  forceRefreshToken,
  STRAVA_API_BASE,
  StravaNotConnectedError,
} from "./strava-cookies";

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

export class StravaUpstreamError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Strava responded ${status}`);
    this.name = "StravaUpstreamError";
    this.status = status;
  }
}

const SECONDS = 60;
const QUARTER_HOUR_MIN = 15;

/** Strava's short-window limit resets on the quarter hour. */
function secondsToNextWindow(): number {
  const now = new Date();
  const elapsed =
    (now.getMinutes() % QUARTER_HOUR_MIN) * SECONDS + now.getSeconds();
  return QUARTER_HOUR_MIN * SECONDS - elapsed;
}

function parsePair(header: string | null): [number, number] | undefined {
  if (!header) {
    return;
  }
  const [a, b] = header.split(",").map((n) => Number(n.trim()));
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return [a, b];
  }
}

function rateLimitFrom(res: Response): StravaRateLimit {
  return {
    retryAfter: secondsToNextWindow(),
    limit: parsePair(res.headers.get("x-ratelimit-limit")),
    usage: parsePair(res.headers.get("x-ratelimit-usage")),
  };
}

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;

function rawFetch(path: string, token: string): Promise<Response> {
  return fetch(`${STRAVA_API_BASE}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

/**
 * GET a Strava endpoint with a valid access token and return its JSON body.
 *
 * - Mints / refreshes the token via `ensureFreshToken()` unless `opts.token`
 *   is supplied (pass a pre-minted token when firing several calls in
 *   parallel so they don't each trigger a refresh).
 * - On a `401` it force-refreshes once and retries; a second `401` means the
 *   grant is dead, so it clears cookies and throws `StravaNotConnectedError`.
 * - On `429` it throws `StravaRateLimitError` carrying the parsed usage.
 * - Any other non-2xx throws `StravaUpstreamError`.
 *
 * Map these to HTTP responses with `stravaErrorResponse()`.
 */
export async function stravaFetch<T>(
  path: string,
  opts?: { token?: string }
): Promise<T> {
  let token = opts?.token ?? (await ensureFreshToken());
  let res = await rawFetch(path, token);

  if (res.status === UNAUTHORIZED) {
    // Rejected despite being fresh — revoked grant or clock skew. One retry
    // on a newly minted token; forceRefreshToken throws/clears if that fails.
    token = await forceRefreshToken();
    res = await rawFetch(path, token);
  }
  if (res.status === UNAUTHORIZED) {
    await clearTokens();
    throw new StravaNotConnectedError();
  }
  if (res.status === TOO_MANY_REQUESTS) {
    throw new StravaRateLimitError(rateLimitFrom(res));
  }
  if (!res.ok) {
    throw new StravaUpstreamError(res.status);
  }
  return (await res.json()) as T;
}

/**
 * Like `stravaFetch`, but returns `null` instead of throwing on any upstream
 * failure. For optional data (e.g. streams for an activity with no GPS) where
 * a missing payload is acceptable and shouldn't fail the whole request.
 */
export async function stravaFetchOptional<T>(
  path: string,
  opts?: { token?: string }
): Promise<T | null> {
  try {
    return await stravaFetch<T>(path, opts);
  } catch {
    return null;
  }
}

/**
 * Translate a thrown Strava error into the JSON response shape the client
 * expects. Re-throws anything unrecognised so Next surfaces a real 500.
 */
export function stravaErrorResponse(err: unknown): NextResponse {
  if (err instanceof StravaNotConnectedError) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  if (err instanceof StravaRateLimitError) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: err.info.retryAfter },
      { status: 429, headers: { "retry-after": String(err.info.retryAfter) } }
    );
  }
  if (err instanceof StravaUpstreamError) {
    return NextResponse.json(
      { error: "strava_error", status: err.status },
      { status: 502 }
    );
  }
  throw err;
}
