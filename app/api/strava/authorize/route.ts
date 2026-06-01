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
  // SECURITY: only accept same-origin relative paths to prevent the OAuth
  // flow from being abused as an open redirect into a phishing domain. The
  // callback validates again as defense-in-depth.
  const url = new URL(request.url);
  const returnTo =
    safeRelativePath(url.searchParams.get("return_to")) ?? "/?strava=connected";

  const authorize = new URL(
    process.env.STRAVA_OAUTH_URL || "https://www.strava.com/oauth/authorize"
  );
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

/** Accept only path-relative URLs anchored at `/`. Rejects absolute URLs
 * (`https://evil.example`) and protocol-relative ones (`//evil.example`). */
function safeRelativePath(value: string | null): string | null {
  if (!value) {
    return null;
  }
  if (!value.startsWith("/")) {
    return null;
  }
  if (value.startsWith("//")) {
    return null;
  }
  return value;
}
