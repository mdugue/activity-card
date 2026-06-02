import { NextResponse } from "next/server";
import {
  consumeOAuthState,
  STRAVA_TOKEN_URL,
  writeTokens,
} from "@/lib/strava-cookies";
import {
  decodeOAuthState,
  isAllowedBounceOrigin,
} from "@/lib/strava-oauth-state";

export async function GET(request: Request) {
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
  // we're the production callback acting as a relay. Validate the
  // target host (open-redirect defence) and 302 the user back to the
  // preview deploy with the original `code` + `state` intact — the
  // preview will read its own state cookie and do the real exchange.
  if (payload.b && payload.b !== url.origin) {
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
  // state cookie belongs to us — validate it before exchanging the code.
  const expected = await consumeOAuthState();
  if (!expected || expected !== payload.r) {
    return NextResponse.redirect(new URL("/?strava=state_mismatch", url));
  }

  const finalReturnTo = resolveSafeReturnTo(payload.p, url);

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    return NextResponse.redirect(new URL("/?strava=token_exchange", url));
  }
  const tokenPayload = await res.json();
  await writeTokens(tokenPayload);

  return NextResponse.redirect(new URL(finalReturnTo, url));
}

/** `payload.p` should already be a safe relative path (validated in the
 * authorize route), but re-validate here so a forged state with an
 * absolute URL can never escape the origin. */
function resolveSafeReturnTo(path: string | undefined, base: URL): string {
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
}
