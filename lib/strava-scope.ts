// The OAuth scopes Effort asks Strava for, and the check that the athlete
// actually granted the one the picker depends on. Strava's consent screen
// lets the athlete untick "View data about your activities"; the callback
// then still receives a valid code — only the `scope` query parameter tells
// that the token can't list activities.

/** Requested on every authorize redirect: the public profile (always
 *  granted) plus read access to the athlete's activities. */
export const STRAVA_SCOPE = "read,activity:read";

/** Scopes that let the token list and read activities. */
const ACTIVITY_READ_SCOPES = new Set(["activity:read", "activity:read_all"]);

/**
 * Does the comma-separated `scope` Strava returned to the callback include
 * activity read access? A missing parameter counts as not granted — Strava
 * always reports what the athlete agreed to.
 */
export const grantsActivityRead = (scope: string | null): boolean =>
  scope !== null &&
  scope.split(",").some((granted) => ACTIVITY_READ_SCOPES.has(granted.trim()));
