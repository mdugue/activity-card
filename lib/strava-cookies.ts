import { cookies } from "next/headers";

// Strava API endpoints. All three are overridable via env so E2E tests can
// point the app at a local mock without monkey-patching `fetch`.
export const STRAVA_API_BASE =
  process.env.STRAVA_API_BASE || "https://www.strava.com/api/v3";
export const STRAVA_TOKEN_URL =
  process.env.STRAVA_TOKEN_URL || "https://www.strava.com/oauth/token";

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
  secure: COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
  maxAge: ONE_YEAR_SECONDS,
} as const;

export interface StravaAthlete {
  avatar?: string;
  firstname?: string;
  id: number;
}

export interface StoredTokens {
  access: string;
  athlete?: StravaAthlete;
  expiresAt: number;
  refresh: string;
}

interface StravaTokenResponse {
  access_token: string;
  athlete?: {
    id?: number;
    firstname?: string;
    profile_medium?: string;
  };
  expires_at: number;
  refresh_token: string;
}

export async function readTokens(): Promise<StoredTokens | null> {
  const store = await cookies();
  const access = store.get(ACCESS)?.value;
  const refresh = store.get(REFRESH)?.value;
  const expiresAtRaw = store.get(EXPIRES)?.value;
  if (!(access && refresh && expiresAtRaw)) {
    return null;
  }
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return null;
  }
  const athleteRaw = store.get(ATHLETE)?.value;
  let athlete: StravaAthlete | undefined;
  if (athleteRaw) {
    try {
      const parsed = JSON.parse(athleteRaw) as unknown;
      // Validate the shape — cookie value is user-controllable (httpOnly
      // protects against JS read, but a server-side tamper could put
      // anything here). `id` flows into `/athletes/${id}/stats`, so
      // require it to be a finite number; rest of the shape is best-effort.
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { id?: unknown }).id === "number" &&
        Number.isFinite((parsed as { id: number }).id)
      ) {
        athlete = parsed as StravaAthlete;
      }
    } catch {
      // Corrupt cookie — ignore, athlete display is non-critical.
    }
  }
  return { access, refresh, expiresAt, athlete };
}

/**
 * Persist the four Strava cookies. Pass `athlete` from the freshly stored
 * `StoredTokens` shape when refreshing so we don't accidentally mangle the
 * `profile_medium` ↔ `avatar` mapping — Strava's refresh response often
 * omits the athlete entirely, in which case we keep the existing cookie
 * value rather than overwriting with stale stored data.
 */
export async function writeTokens(
  payload: StravaTokenResponse,
  options?: { athleteOverride?: StravaAthlete }
): Promise<void> {
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
      id: payload.athlete.id,
      firstname: payload.athlete.firstname ?? fallback?.firstname,
      avatar: payload.athlete.profile_medium ?? fallback?.avatar,
    };
    store.set(ATHLETE, JSON.stringify(athlete), COOKIE_BASE);
  } else if (options?.athleteOverride) {
    // Refresh didn't include athlete data at all — carry the previously
    // stored athlete forward unchanged.
    store.set(ATHLETE, JSON.stringify(options.athleteOverride), COOKIE_BASE);
  }
}

export async function clearTokens(): Promise<void> {
  const store = await cookies();
  for (const name of [ACCESS, REFRESH, EXPIRES, ATHLETE]) {
    store.delete(name);
  }
}

export async function setOAuthState(state: string): Promise<void> {
  const store = await cookies();
  store.set(STATE, state, { ...COOKIE_BASE, maxAge: 600 });
}

export async function consumeOAuthState(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(STATE)?.value ?? null;
  if (value) {
    store.delete(STATE);
  }
  return value;
}

/** Read the OAuth state cookie WITHOUT deleting it. Use this when you
 * need to validate state before a fallible operation (e.g. token
 * exchange) so the cookie survives for a retry attempt if the operation
 * fails. Pair with `clearOAuthState()` on success. */
export async function peekOAuthState(): Promise<string | null> {
  const store = await cookies();
  return store.get(STATE)?.value ?? null;
}

/** Delete the OAuth state cookie. Idempotent; safe to call when the
 * cookie is already absent. */
export async function clearOAuthState(): Promise<void> {
  const store = await cookies();
  store.delete(STATE);
}

/**
 * Return a valid access token, refreshing transparently if it expires in the
 * next minute. Throws if no tokens are stored or the refresh fails — callers
 * should treat that as "not connected" and surface a 401.
 */
export async function ensureFreshToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) {
    throw new StravaNotConnectedError();
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt - nowSec > 60) {
    return tokens.access;
  }
  return refreshStoredTokens(tokens);
}

/**
 * Force a token refresh regardless of the stored expiry. Used when Strava
 * rejects a token we believed was fresh (revoked grant or clock skew) — we
 * mint a new one and let the caller retry once before giving up.
 */
export async function forceRefreshToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) {
    throw new StravaNotConnectedError();
  }
  return refreshStoredTokens(tokens);
}

async function refreshStoredTokens(tokens: StoredTokens): Promise<string> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!(clientId && clientSecret)) {
    throw new Error("STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET not set");
  }
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh,
    }),
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
  const payload = (await res.json()) as StravaTokenResponse;
  await writeTokens(payload, { athleteOverride: tokens.athlete });
  return payload.access_token;
}

export class StravaNotConnectedError extends Error {
  constructor() {
    super("Strava not connected");
    this.name = "StravaNotConnectedError";
  }
}
