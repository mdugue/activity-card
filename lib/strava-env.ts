import { hasText } from "./text";

/** An env value, or `fallback` when it is unset or blank. */
export const envOr = (value: string | undefined, fallback: string): string =>
  hasText(value) ? value : fallback;

/** The Strava app credentials every token grant needs. */
export interface StravaAppCredentials {
  clientId: string;
  clientSecret: string;
}

/** Credentials plus the registered OAuth callback URL. */
export interface StravaOAuthConfig extends StravaAppCredentials {
  redirectUri: string;
}

/** `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET`, or `null` unless both are
 * set and non-empty. */
export const readStravaCredentials = (): StravaAppCredentials | null => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!(hasText(clientId) && hasText(clientSecret))) {
    return null;
  }
  return { clientId, clientSecret };
};

/** The credentials plus `STRAVA_REDIRECT_URI`, or `null` unless all three
 * are set and non-empty. */
export const readStravaOAuthConfig = (): StravaOAuthConfig | null => {
  const credentials = readStravaCredentials();
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  if (credentials === null || !hasText(redirectUri)) {
    return null;
  }
  return { ...credentials, redirectUri };
};
