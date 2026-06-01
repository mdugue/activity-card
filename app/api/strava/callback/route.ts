import { NextResponse } from "next/server";
import {
  consumeOAuthState,
  STRAVA_TOKEN_URL,
  writeTokens,
} from "@/lib/strava-cookies";

export async function GET(request: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!(clientId && clientSecret)) {
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

  const [stateToken, returnEncoded] = stateParam.split("|");
  const expected = await consumeOAuthState();
  if (!expected || expected !== stateToken) {
    return NextResponse.redirect(new URL("/?strava=state_mismatch", url));
  }

  // Compute the post-callback destination BEFORE doing the token exchange,
  // so a malicious `return_to` is rejected without burning a code.
  // The state param is `${random}|${encodeURIComponent(returnTo)}`; we
  // accept only same-origin, path-relative targets so the OAuth flow can't
  // be used as an open-redirect into a phishing domain.
  const safeReturnTo = resolveSafeReturnTo(returnEncoded, url);

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
  const payload = await res.json();
  await writeTokens(payload);

  return NextResponse.redirect(new URL(safeReturnTo, url));
}

function resolveSafeReturnTo(encoded: string | undefined, base: URL): string {
  if (!encoded) {
    return "/?strava=connected";
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return "/?strava=connected";
  }
  // Resolve against the request origin and reject anything that lands
  // elsewhere — protocol-relative URLs ("//evil.example") and absolute
  // URLs ("https://evil.example") both fail this check.
  let resolved: URL;
  try {
    resolved = new URL(decoded, base);
  } catch {
    return "/?strava=connected";
  }
  if (resolved.origin !== base.origin) {
    return "/?strava=connected";
  }
  return resolved.pathname + resolved.search + resolved.hash;
}
