import { NextResponse } from "next/server";
import { stravaErrorResponse, stravaFetch } from "@/lib/strava-client";
import { clampedIntParam } from "@/lib/strava-params";
import { largestPhotoUrl, upscaledPhotoUrl } from "@/lib/strava-photos";
import type { StravaPhotoListItem } from "@/lib/strava-types";

const NUMERIC_ID = /^\d+$/;
// Strava buckets photo sizes and silently serves a small variant for
// unsupported values; 5000 is the de-facto "largest available rendition"
// request, comfortably above the 2160×2700 export canvas.
const PHOTO_FULL_SIZE = 5000;
// The largest standard CDN rendition's long edge (the Strava web app links
// `…-1536x2048.jpg` / `…-2048x1536.jpg`).
const PHOTO_TARGET_LONG_EDGE = 2048;

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
    const src = largestPhotoUrl(list?.[index]?.urls);
    if (!src) {
      return NextResponse.json({ error: "photo_not_found" }, { status: 404 });
    }
    // The API frequently returns a mid-size rendition no matter what `size`
    // was requested, but the 2048-class rendition exists at the same CDN
    // path (it's what strava.com itself links). Try it first and fall back
    // to the URL the API actually gave us.
    const upgraded = upscaledPhotoUrl(src, PHOTO_TARGET_LONG_EDGE);
    const candidates = upgraded ? [upgraded, src] : [src];
    let upstream: Response | undefined;
    for (const candidate of candidates) {
      // Sequential on purpose: the original URL is only fetched when the
      // upgraded rendition doesn't exist.
      const res = await fetch(candidate, { cache: "no-store" });
      if (res.ok && res.body) {
        upstream = res;
        break;
      }
    }
    if (!upstream) {
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
