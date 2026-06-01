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

const COOKIE_BASE = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
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
      athlete = JSON.parse(athleteRaw) as StravaAthlete;
    } catch {
      // Corrupt cookie — ignore, athlete display is non-critical.
    }
  }
  return { access, refresh, expiresAt, athlete };
}

export async function writeTokens(payload: StravaTokenResponse): Promise<void> {
  const store = await cookies();
  store.set(ACCESS, payload.access_token, COOKIE_BASE);
  store.set(REFRESH, payload.refresh_token, COOKIE_BASE);
  store.set(EXPIRES, String(payload.expires_at), COOKIE_BASE);
  if (payload.athlete?.id !== undefined) {
    const athlete: StravaAthlete = {
      id: payload.athlete.id,
      firstname: payload.athlete.firstname,
      avatar: payload.athlete.profile_medium,
    };
    store.set(ATHLETE, JSON.stringify(athlete), COOKIE_BASE);
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
    await clearTokens();
    throw new StravaNotConnectedError();
  }
  const payload = (await res.json()) as StravaTokenResponse;
  await writeTokens({ ...payload, athlete: payload.athlete ?? tokens.athlete });
  return payload.access_token;
}

export class StravaNotConnectedError extends Error {
  constructor() {
    super("Strava not connected");
    this.name = "StravaNotConnectedError";
  }
}
