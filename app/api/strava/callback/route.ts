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

  const returnTo = returnEncoded
    ? decodeURIComponent(returnEncoded)
    : "/?strava=connected";
  return NextResponse.redirect(new URL(returnTo, url));
}
