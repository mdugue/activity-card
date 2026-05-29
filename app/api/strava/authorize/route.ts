import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { setOAuthState } from "@/lib/strava-cookies";

export async function GET(request: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  if (!(clientId && redirectUri)) {
    return NextResponse.json(
      { error: "Strava is not configured on this server" },
      { status: 500 }
    );
  }
  const state = randomBytes(24).toString("hex");
  await setOAuthState(state);

  // Carry through any `?return_to` so the callback can bounce the user back
  // where they started. Defaults to `/` with a `strava=connected` flag.
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/?strava=connected";

  const authorize = new URL("https://www.strava.com/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("approval_prompt", "auto");
  authorize.searchParams.set("scope", "read,activity:read");
  authorize.searchParams.set(
    "state",
    `${state}|${encodeURIComponent(returnTo)}`
  );

  return NextResponse.redirect(authorize);
}
