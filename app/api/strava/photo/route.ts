import { NextResponse } from "next/server";
import { stravaErrorResponse, stravaFetch } from "@/lib/strava-client";
import { clampedIntParam } from "@/lib/strava-params";
import type { StravaPhotoListItem } from "@/lib/strava-types";

const NUMERIC_ID = /^\d+$/;
// Big enough for the 2160×2700 export canvas without pulling originals.
const PHOTO_FULL_SIZE = 2400;

/**
 * Streams one of an activity's Strava photos through our origin. The image
 * URL is re-resolved server-side from Strava's photo list (the client only
 * supplies an activity id + index), so no client-controlled URL is ever
 * fetched, and the same-origin response keeps html-to-image's export canvas
 * untainted.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const activity = url.searchParams.get("activity") ?? "";
  if (!NUMERIC_ID.test(activity)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const index = clampedIntParam(url.searchParams.get("index"), 0, 0, 100);

  try {
    const list = await stravaFetch<StravaPhotoListItem[]>(
      `/activities/${activity}/photos?size=${PHOTO_FULL_SIZE}&photo_sources=true`
    );
    const urls = list?.[index]?.urls;
    const src = urls ? Object.values(urls)[0] : undefined;
    if (!src) {
      return NextResponse.json({ error: "photo_not_found" }, { status: 404 });
    }
    const upstream = await fetch(src, { cache: "no-store" });
    if (!(upstream.ok && upstream.body)) {
      return NextResponse.json(
        { error: "photo_fetch_failed" },
        { status: 502 }
      );
    }
    return new NextResponse(upstream.body, {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return stravaErrorResponse(err);
  }
}
