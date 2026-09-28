import { NextResponse } from "next/server";

import {
  clearOAuthState,
  peekOAuthState,
  STRAVA_TOKEN_URL,
  writeTokens,
} from "@/lib/strava-cookies";
import { readStravaOAuthConfig } from "@/lib/strava-env";
import {
  decodeOAuthState,
  isAllowedBounceOrigin,
  verifyBounce,
} from "@/lib/strava-oauth-state";
import { grantsActivityRead } from "@/lib/strava-scope";
import { readStravaTokenResponse } from "@/lib/strava-token-response";
import { hasText } from "@/lib/text";

const CONNECTED_PATH = "/?strava=connected";

/** `payload.p` should already be a safe relative path (validated in the
 * authorize route), but re-validate here so a forged state with an
 * absolute URL can never escape the origin. */
const resolveSafeReturnTo = (path: string | undefined, base: URL): string => {
  if (!hasText(path)) {
    return CONNECTED_PATH;
  }
  let resolved: URL;
  try {
    resolved = new URL(path, base);
  } catch {
    return CONNECTED_PATH;
  }
  if (resolved.origin !== base.origin) {
    return CONNECTED_PATH;
  }
  return resolved.pathname + resolved.search + resolved.hash;
};

export const GET = async (request: Request) => {
  const config = readStravaOAuthConfig();
  if (config === null) {
    return NextResponse.json(
      { error: "Strava is not configured on this server" },
      { status: 500 }
    );
  }
  const { clientId, clientSecret, redirectUri } = config;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  if (hasText(errorParam)) {
    return NextResponse.redirect(
      new URL(`/?strava=denied&reason=${encodeURIComponent(errorParam)}`, url)
    );
  }
  if (!(hasText(code) && hasText(stateParam))) {
    return NextResponse.redirect(new URL("/?strava=failed", url));
  }

  const payload = decodeOAuthState(stateParam);
  if (payload === null) {
    return NextResponse.redirect(new URL("/?strava=state_mismatch", url));
  }

  // ── Production bounce ──────────────────────────────────────────────
  // If the initiator advertised a bounce origin different from ours,
  // we're the production callback acting as a relay. Verify the target
  // was signed by one of our deployments (HMAC bound to this nonce), check
  // the host allowlist as a second filter, and only then 302 the user back
  // to the preview deploy with the original `code` + `state` intact — the
  // preview will read its own state cookie and do the real exchange.
  if (hasText(payload.b) && payload.b !== url.origin) {
    if (!verifyBounce(payload.b, payload.r, payload.s, clientSecret)) {
      return NextResponse.redirect(new URL("/?strava=bounce_rejected", url));
    }
    const registeredHost = new URL(redirectUri).hostname;
    if (!isAllowedBounceOrigin(payload.b, registeredHost)) {
      return NextResponse.redirect(new URL("/?strava=bounce_rejected", url));
    }
    const bounce = new URL("/api/strava/callback", payload.b);
    bounce.searchParams.set("code", code);
    bounce.searchParams.set("state", stateParam);
    // The preview checks the granted scope too, so relay what Strava sent.
    const scope = url.searchParams.get("scope");
    if (scope !== null) {
      bounce.searchParams.set("scope", scope);
    }
    return NextResponse.redirect(bounce);
  }

  // ── Normal flow ────────────────────────────────────────────────────
  // We're either the original initiator (single-deploy case) or the
  // preview that just received a production bounce. Either way, the
  // state cookie belongs to us — peek (don't consume) so a failed token
  // exchange leaves the cookie intact for a retry; we only clear after
  // the exchange succeeds.
  const expected = await peekOAuthState();
  if (!hasText(expected) || expected !== payload.r) {
    return NextResponse.redirect(new URL("/?strava=state_mismatch", url));
  }

  // The athlete can untick activity access on Strava's consent screen; the
  // code is still valid, but the token couldn't list a single activity and
  // the picker would just come up empty. Stop here, before any token is
  // stored, and say what's missing.
  if (!grantsActivityRead(url.searchParams.get("scope"))) {
    await clearOAuthState();
    return NextResponse.redirect(new URL("/?strava=scope_missing", url));
  }

  const finalReturnTo = resolveSafeReturnTo(payload.p, url);

  const res = await fetch(STRAVA_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!res.ok) {
    return NextResponse.redirect(new URL("/?strava=token_exchange", url));
  }
  // Validate Strava's token payload at the boundary (same helper as the
  // refresh path in lib/strava-cookies.ts) before any cookie is written.
  // The state cookie stays intact so the user can retry.
  const tokenPayload = await readStravaTokenResponse(res);
  if (tokenPayload === null) {
    return NextResponse.redirect(new URL("/?strava=token_exchange", url));
  }
  await writeTokens(tokenPayload);
  // Code redeemed successfully — invalidate the state cookie so a stale
  // refresh of the callback URL doesn't try to re-redeem (codes are
  // single-use; Strava would 4xx).
  await clearOAuthState();

  return NextResponse.redirect(new URL(finalReturnTo, url));
};
