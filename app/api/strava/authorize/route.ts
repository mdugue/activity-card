import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { setOAuthState } from "@/lib/strava-cookies";
import { envOr, readStravaOAuthConfig } from "@/lib/strava-env";
import {
  encodeOAuthState,
  safeRelativePath,
  signBounce,
} from "@/lib/strava-oauth-state";
import type { OAuthStatePayload } from "@/lib/strava-oauth-state";
import { STRAVA_SCOPE } from "@/lib/strava-scope";

/**
 * Kick off the Strava OAuth round-trip.
 *
 * Production-bounce shape: Strava only accepts one registered callback
 * domain per app, but our Vercel preview deploys each have their own
 * origin. We solve this by always sending Strava the stable production
 * `redirect_uri` (from `STRAVA_REDIRECT_URI`), and stuffing the actual
 * initiating origin into `state.b`. The production callback notices the
 * mismatch and 302s back to the preview, which then runs the normal
 * token exchange against its own cookie store. `state.b` is signed
 * (`state.s`, keyed with `STRAVA_CLIENT_SECRET` and bound to the nonce) so
 * production only relays codes to origins one of our deployments vouched for.
 */
export const GET = async (request: Request) => {
  const config = readStravaOAuthConfig();
  if (config === null) {
    return NextResponse.json(
      { error: "Strava is not configured on this server" },
      { status: 500 }
    );
  }
  const { clientId, clientSecret, redirectUri } = config;

  const nonce = randomBytes(24).toString("hex");
  await setOAuthState(nonce);

  const url = new URL(request.url);
  const currentOrigin = url.origin;
  const redirectOrigin = new URL(redirectUri).origin;

  const payload: OAuthStatePayload = { r: nonce };
  // Bounce field: present only when this deploy isn't the registered
  // callback host. Production reads it to relay the code back to us, and
  // only does so when the signature (bound to this nonce) verifies.
  if (currentOrigin !== redirectOrigin) {
    payload.b = currentOrigin;
    payload.s = signBounce(currentOrigin, nonce, clientSecret);
  }
  // Optional same-origin path the user wanted to land on (e.g. a deep
  // link). Anything cross-origin is dropped here AND re-validated in
  // the callback as defense-in-depth.
  const returnPath = safeRelativePath(url.searchParams.get("return_to"));
  if (returnPath !== null) {
    payload.p = returnPath;
  }

  const authorize = new URL(
    envOr(
      process.env.STRAVA_OAUTH_URL,
      "https://www.strava.com/oauth/authorize"
    )
  );
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("approval_prompt", "auto");
  authorize.searchParams.set("scope", STRAVA_SCOPE);
  authorize.searchParams.set("state", encodeOAuthState(payload));

  return NextResponse.redirect(authorize);
};
