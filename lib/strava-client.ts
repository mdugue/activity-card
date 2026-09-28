import { NextResponse } from "next/server";
import type { z } from "zod/mini";

import {
  clearTokens,
  ensureFreshToken,
  forceRefreshToken,
  STRAVA_API_BASE,
  StravaNotConnectedError,
} from "./strava-cookies";
import { rateLimitFrom, StravaRateLimitError } from "./strava-rate-limit";

export class StravaUpstreamError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Strava responded ${status}`);
    this.name = "StravaUpstreamError";
    this.status = status;
  }
}

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;

const rawFetch = async (path: string, token: string): Promise<Response> =>
  await fetch(`${STRAVA_API_BASE}${path}`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  });

/**
 * GET a Strava endpoint with a valid access token and return its JSON body,
 * parsed with `schema`.
 *
 * - Mints / refreshes the token via `ensureFreshToken()` unless `opts.token`
 *   is supplied (pass a pre-minted token when firing several calls in
 *   parallel so they don't each trigger a refresh).
 * - On a `401` it force-refreshes once and retries; a second `401` means the
 *   grant is dead, so it clears cookies and throws `StravaNotConnectedError`.
 * - On `429` it throws `StravaRateLimitError` carrying the parsed usage.
 * - Any other non-2xx throws `StravaUpstreamError`, as does a 2xx body that
 *   doesn't match `schema`.
 *
 * Map these to HTTP responses with `stravaErrorResponse()`.
 */
export const stravaFetch = async <T>(
  path: string,
  schema: z.ZodMiniType<T>,
  opts?: { token?: string }
): Promise<T> => {
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
  const body: unknown = await res.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new StravaUpstreamError(res.status);
  }
  return parsed.data;
};

/**
 * Like `stravaFetch`, but returns `null` instead of throwing when Strava
 * itself returns an upstream error (404, 5xx) — for optional data like the
 * streams of an activity with no GPS. Auth and rate-limit errors still
 * throw: silently dropping a 401 would let a revoked grant produce a
 * "successful" but data-poor response; dropping a 429 would burn the next
 * call against the limit anyway.
 */
export const stravaFetchOptional = async <T>(
  path: string,
  schema: z.ZodMiniType<T>,
  opts?: { token?: string }
): Promise<T | null> => {
  try {
    return await stravaFetch(path, schema, opts);
  } catch (error) {
    if (error instanceof StravaUpstreamError) {
      return null;
    }
    throw error;
  }
};

/**
 * Translate a thrown Strava error into the JSON response shape the client
 * expects. Re-throws anything unrecognised so Next surfaces a real 500.
 */
export const stravaErrorResponse = (cause: unknown): NextResponse => {
  if (cause instanceof StravaNotConnectedError) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  if (cause instanceof StravaRateLimitError) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: cause.info.retryAfter },
      { headers: { "retry-after": String(cause.info.retryAfter) }, status: 429 }
    );
  }
  if (cause instanceof StravaUpstreamError) {
    return NextResponse.json(
      { error: "strava_error", status: cause.status },
      { status: 502 }
    );
  }
  throw cause;
};
