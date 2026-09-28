import { z } from "zod/mini";

import type { StravaTokenResponse } from "./strava-cookies";

/**
 * Strava's `/oauth/token` payload (both the code exchange and the refresh
 * grant), validated before anything is written to cookies. Unknown fields
 * are stripped; the athlete sub-object is best-effort (Strava's refresh
 * response often omits it, and display fields may be null).
 */
const TokenResponseSchema = z.object({
  access_token: z.string().check(z.minLength(1)),
  athlete: z.optional(
    z.nullable(
      z.object({
        firstname: z.optional(z.nullable(z.string())),
        id: z.optional(z.nullable(z.int())),
        profile_medium: z.optional(z.nullable(z.string())),
      })
    )
  ),
  expires_at: z.int().check(z.positive()),
  refresh_token: z.string().check(z.minLength(1)),
});

/**
 * Parse an `/oauth/token` JSON body into a `StravaTokenResponse`, or
 * `null` when it doesn't have the shape the cookie writer relies on
 * (non-empty tokens, an integer expiry). Nulls in the optional athlete
 * fields are normalised to `undefined`.
 */
export const parseStravaTokenResponse = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- this IS the I/O-boundary parser the rule points to: its input is the raw, not-yet-decoded token-endpoint body.
  json: unknown
): StravaTokenResponse | null => {
  const result = TokenResponseSchema.safeParse(json);
  if (!result.success) {
    return null;
  }
  const { access_token, refresh_token, expires_at, athlete } = result.data;
  return {
    access_token,
    athlete: athlete
      ? {
          firstname: athlete.firstname ?? undefined,
          id: athlete.id ?? undefined,
          profile_medium: athlete.profile_medium ?? undefined,
        }
      : undefined,
    expires_at,
    refresh_token,
  };
};

/** Read a token endpoint response body and validate it. Returns `null`
 * for malformed JSON as well as for a well-formed body of the wrong shape. */
export const readStravaTokenResponse = async (
  res: Response
): Promise<StravaTokenResponse | null> => {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }
  return parseStravaTokenResponse(json);
};
