import { cookies } from "next/headers";
import { z } from "zod/mini";

import { envOr, readStravaCredentials } from "./strava-env";
import { hasText } from "./strava-params";
import { lenient } from "./strava-schemas";
import { readStravaTokenResponse } from "./strava-token-response";

// Strava API endpoints. All three are overridable via env so E2E tests can
// point the app at a local mock without monkey-patching `fetch`.
export const STRAVA_API_BASE = envOr(
  process.env.STRAVA_API_BASE,
  "https://www.strava.com/api/v3"
);
export const STRAVA_TOKEN_URL = envOr(
  process.env.STRAVA_TOKEN_URL,
  "https://www.strava.com/oauth/token"
);

const ACCESS = "strava_access";
const REFRESH = "strava_refresh";
const EXPIRES = "strava_expires_at";
const ATHLETE = "strava_athlete";
const STATE = "strava_oauth_state";

// `Secure` would block cookies over plain http (E2E runs on localhost). Test
// runners flip STRAVA_INSECURE_COOKIES=1 to opt out; production still gets
// the secure flag automatically.
const COOKIE_SECURE =
  process.env.STRAVA_INSECURE_COOKIES === "1"
    ? false
    : process.env.NODE_ENV === "production";

// Strava refresh tokens are long-lived (revoked on disconnect, not on a
// timer), so give every cookie a long maxAge — the actual access-token
// expiry lives in the `strava_expires_at` cookie value and drives
// `ensureFreshToken`, not in the cookies' own browser lifetimes. Without
// this, cookies are session-scoped and disappear when the browser closes,
// forcing the user to reconnect even though their refresh token is fine.
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const COOKIE_BASE = {
  httpOnly: true,
  maxAge: ONE_YEAR_SECONDS,
  path: "/",
  sameSite: "lax",
  secure: COOKIE_SECURE,
} as const;

export interface StravaAthlete {
  avatar?: string;
  firstname?: string;
  id: number;
}

/**
 * The athlete cookie. Its value is user-controllable (httpOnly protects
 * against JS read, but a server-side tamper could put anything here). `id`
 * flows into `/athletes/${id}/stats`, so it must be a finite number (zod's
 * `number()` rejects NaN / ±Infinity); the display fields are best-effort
 * and read as absent when they aren't strings.
 */
const StoredAthleteSchema = z.object({
  avatar: lenient(z.string()),
  firstname: lenient(z.string()),
  id: z.number(),
});

const parseStoredAthlete = (raw: string): StravaAthlete | undefined => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    // Corrupt cookie — ignore, athlete display is non-critical.
    return undefined;
  }
  const result = StoredAthleteSchema.safeParse(json);
  if (!result.success) {
    return undefined;
  }
  const { avatar, firstname, id } = result.data;
  return { avatar: avatar ?? undefined, firstname: firstname ?? undefined, id };
};

export interface StoredTokens {
  access: string;
  athlete?: StravaAthlete;
  expiresAt: number;
  refresh: string;
}

export interface StravaTokenResponse {
  access_token: string;
  athlete?: {
    id?: number;
    firstname?: string;
    profile_medium?: string;
  };
  expires_at: number;
  refresh_token: string;
}

export const readTokens = async (): Promise<StoredTokens | null> => {
  const store = await cookies();
  const access = store.get(ACCESS)?.value;
  const refresh = store.get(REFRESH)?.value;
  const expiresAtRaw = store.get(EXPIRES)?.value;
  if (!(hasText(access) && hasText(refresh) && hasText(expiresAtRaw))) {
    return null;
  }
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return null;
  }
  const athleteRaw = store.get(ATHLETE)?.value;
  const athlete = hasText(athleteRaw)
    ? parseStoredAthlete(athleteRaw)
    : undefined;
  return { access, athlete, expiresAt, refresh };
};

/**
 * Persist the four Strava cookies. Pass `athlete` from the freshly stored
 * `StoredTokens` shape when refreshing so we don't accidentally mangle the
 * `profile_medium` ↔ `avatar` mapping — Strava's refresh response often
 * omits the athlete entirely, in which case we keep the existing cookie
 * value rather than overwriting with stale stored data.
 */
export const writeTokens = async (
  payload: StravaTokenResponse,
  options?: { athleteOverride?: StravaAthlete }
): Promise<void> => {
  const store = await cookies();
  store.set(ACCESS, payload.access_token, COOKIE_BASE);
  store.set(REFRESH, payload.refresh_token, COOKIE_BASE);
  store.set(EXPIRES, String(payload.expires_at), COOKIE_BASE);
  if (payload.athlete?.id !== undefined) {
    // Merge fields rather than overwrite: Strava's refresh response often
    // includes `athlete.id` but omits `firstname` / `profile_medium`, and
    // we don't want a refresh to wipe display data we already had. Prefer
    // the new value when present, fall back to the previously stored one.
    const fallback = options?.athleteOverride;
    const athlete: StravaAthlete = {
      avatar: payload.athlete.profile_medium ?? fallback?.avatar,
      firstname: payload.athlete.firstname ?? fallback?.firstname,
      id: payload.athlete.id,
    };
    store.set(ATHLETE, JSON.stringify(athlete), COOKIE_BASE);
  } else if (options?.athleteOverride !== undefined) {
    // Refresh didn't include athlete data at all — carry the previously
    // stored athlete forward unchanged.
    store.set(ATHLETE, JSON.stringify(options.athleteOverride), COOKIE_BASE);
  }
};

export const clearTokens = async (): Promise<void> => {
  const store = await cookies();
  for (const name of [ACCESS, REFRESH, EXPIRES, ATHLETE]) {
    store.delete(name);
  }
};

export const setOAuthState = async (state: string): Promise<void> => {
  const store = await cookies();
  store.set(STATE, state, { ...COOKIE_BASE, maxAge: 600 });
};

export const consumeOAuthState = async (): Promise<string | null> => {
  const store = await cookies();
  const value = store.get(STATE)?.value ?? null;
  if (hasText(value)) {
    store.delete(STATE);
  }
  return value;
};

/** Read the OAuth state cookie WITHOUT deleting it. Use this when you
 * need to validate state before a fallible operation (e.g. token
 * exchange) so the cookie survives for a retry attempt if the operation
 * fails. Pair with `clearOAuthState()` on success. */
export const peekOAuthState = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(STATE)?.value ?? null;
};

/** Delete the OAuth state cookie. Idempotent; safe to call when the
 * cookie is already absent. */
export const clearOAuthState = async (): Promise<void> => {
  const store = await cookies();
  store.delete(STATE);
};

export class StravaNotConnectedError extends Error {
  constructor() {
    super("Strava not connected");
    this.name = "StravaNotConnectedError";
  }
}

const refreshStoredTokens = async (tokens: StoredTokens): Promise<string> => {
  const credentials = readStravaCredentials();
  if (credentials === null) {
    throw new Error("STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET not set");
  }
  const { clientId, clientSecret } = credentials;
  const res = await fetch(STRAVA_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh,
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!res.ok) {
    // 4xx means the refresh grant is dead (revoked, expired, invalid) —
    // clear cookies so the user has to reconnect. 5xx is a Strava-side
    // hiccup; leave the cookies alone so a transient outage doesn't
    // log everyone out.
    if (res.status >= 400 && res.status < 500) {
      await clearTokens();
    }
    throw new StravaNotConnectedError();
  }
  const payload = await readStravaTokenResponse(res);
  if (payload === null) {
    // A 2xx whose body isn't a token bundle is a Strava-side fault, not a
    // dead grant: like a 5xx, fail this request as "not connected" but
    // keep the stored cookies so the next request can refresh again.
    throw new StravaNotConnectedError();
  }
  await writeTokens(payload, { athleteOverride: tokens.athlete });
  return payload.access_token;
};

/**
 * Return a valid access token, refreshing transparently if it expires in the
 * next minute. Throws if no tokens are stored or the refresh fails — callers
 * should treat that as "not connected" and surface a 401.
 */
export const ensureFreshToken = async (): Promise<string> => {
  const tokens = await readTokens();
  if (!tokens) {
    throw new StravaNotConnectedError();
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt - nowSec > 60) {
    return tokens.access;
  }
  return await refreshStoredTokens(tokens);
};

/**
 * Force a token refresh regardless of the stored expiry. Used when Strava
 * rejects a token we believed was fresh (revoked grant or clock skew) — we
 * mint a new one and let the caller retry once before giving up.
 */
export const forceRefreshToken = async (): Promise<string> => {
  const tokens = await readTokens();
  if (!tokens) {
    throw new StravaNotConnectedError();
  }
  return await refreshStoredTokens(tokens);
};
