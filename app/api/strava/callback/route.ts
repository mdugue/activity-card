import { NextResponse } from "next/server";

import {
  clearOAuthState,
  peekOAuthState,
  STRAVA_TOKEN_URL,
  writeTokens,
} from "@/lib/strava-cookies";
import {
  decodeOAuthState,
  isAllowedBounceOrigin,
  verifyBounce,
} from "@/lib/strava-oauth-state";
import { readStravaTokenResponse } from "@/lib/strava-token-response";

/** `payload.p` should already be a safe relative path (validated in the
 * authorize route), but re-validate here so a forged state with an
 * absolute URL can never escape the origin. */
const resolveSafeReturnTo = (path: string | undefined, base: URL): string => {
  if (!path) {
    return "/?strava=connected";
  }
  let resolved: URL;
  try {
    resolved = new URL(path, base);
  } catch {
    return "/?strava=connected";
  }
  if (resolved.origin !== base.origin) {
    return "/?strava=connected";
  }
  return resolved.pathname + resolved.search + resolved.hash;
};

export const GET = async (request: Request) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  if (!(clientId && clientSecret && redirectUri)) {
    return NextResponse.json(
      { error: "Strava is not configured on this server" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/?strava=denied&reason=${encodeURIComponent(errorParam)}`, url)
    );
  }
  if (!(code && stateParam)) {
    return NextResponse.redirect(new URL("/?strava=failed", url));
  }

  const payload = decodeOAuthState(stateParam);
  if (!payload) {
    return NextResponse.redirect(new URL("/?strava=state_mismatch", url));
  }

  // ── Production bounce ──────────────────────────────────────────────
  // If the initiator advertised a bounce origin different from ours,
  // we're the production callback acting as a relay. Verify the target
  // was signed by one of our deployments (HMAC bound to this nonce), check
  // the host allowlist as a second filter, and only then 302 the user back
  // to the preview deploy with the original `code` + `state` intact — the
  // preview will read its own state cookie and do the real exchange.
  if (payload.b && payload.b !== url.origin) {
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
    return NextResponse.redirect(bounce);
  }

  // ── Normal flow ────────────────────────────────────────────────────
  // We're either the original initiator (single-deploy case) or the
  // preview that just received a production bounce. Either way, the
  // state cookie belongs to us — peek (don't consume) so a failed token
  // exchange leaves the cookie intact for a retry; we only clear after
  // the exchange succeeds.
  const expected = await peekOAuthState();
  if (!expected || expected !== payload.r) {
    return NextResponse.redirect(new URL("/?strava=state_mismatch", url));
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
  if (!tokenPayload) {
    return NextResponse.redirect(new URL("/?strava=token_exchange", url));
  }
  await writeTokens(tokenPayload);
  // Code redeemed successfully — invalidate the state cookie so a stale
  // refresh of the callback URL doesn't try to re-redeem (codes are
  // single-use; Strava would 4xx).
  await clearOAuthState();

  return NextResponse.redirect(new URL(finalReturnTo, url));
};
