import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/strava-cookies";

/**
 * Clearing the Strava cookies is state-changing, so reject cross-site
 * callers: a top-level cross-site form POST would otherwise apply our
 * cookie-deletion headers (a forced disconnect — nuisance, not exposure).
 * Same-origin fetches send `Sec-Fetch-Site: same-origin` in all evergreen
 * browsers; the Origin fallback covers clients that omit fetch metadata.
 */
export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") {
    return NextResponse.json({ error: "cross_origin" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (!site && origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "cross_origin" }, { status: 403 });
  }
  await clearTokens();
  return new NextResponse(null, { status: 204 });
}
