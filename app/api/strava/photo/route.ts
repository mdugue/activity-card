import { NextResponse } from "next/server";

import { stravaErrorResponse, stravaFetch } from "@/lib/strava-client";
import { STRAVA_API_BASE } from "@/lib/strava-cookies";
import { clampedIntParam, hasText } from "@/lib/strava-params";
import {
  allowedPhotoContentType,
  exceedsPhotoSizeCap,
  isAllowedPhotoUrl,
  limitBody,
} from "@/lib/strava-photo-proxy";
import { largestPhotoUrl, upscaledPhotoUrl } from "@/lib/strava-photos";
import { StravaPhotoListSchema } from "@/lib/strava-schemas";

const NUMERIC_ID = /^\d+$/u;
// Strava buckets photo sizes and silently serves a small variant for
// unsupported values; 5000 is the de-facto "largest available rendition"
// request, comfortably above the 2160×2700 export canvas.
const PHOTO_FULL_SIZE = 5000;
// The largest standard CDN rendition's long edge (the Strava web app links
// `…-1536x2048.jpg` / `…-2048x1536.jpg`).
const PHOTO_TARGET_LONG_EDGE = 2048;
// The API base's origin is trusted as a photo host too: in production it's
// strava.com (already on the CDN allowlist); under the E2E / local mock it's
// the mock server, which serves its photo fixtures from the same origin.
const TRUSTED_PHOTO_ORIGIN = new URL(STRAVA_API_BASE).origin;

type PhotoFailure =
  | "photo_fetch_failed"
  | "photo_host_rejected"
  | "photo_too_large"
  | "photo_unsupported_type";

interface AcceptedPhoto {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  ok: true;
}

interface RejectedPhoto {
  failure: PhotoFailure;
  ok: false;
}

type PhotoOutcome = AcceptedPhoto | RejectedPhoto;

const rejected = (failure: PhotoFailure): RejectedPhoto => ({
  failure,
  ok: false,
});

/** Fetch one candidate URL and apply every proxy guard. Redirects are not
 * followed (`redirect: "manual"` turns them into a non-ok response), so the
 * host check on `url` is the host the bytes actually come from. */
const fetchPhoto = async (url: string): Promise<PhotoOutcome> => {
  if (!isAllowedPhotoUrl(url, TRUSTED_PHOTO_ORIGIN)) {
    return rejected("photo_host_rejected");
  }
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", redirect: "manual" });
  } catch {
    return rejected("photo_fetch_failed");
  }
  if (!(res.ok && res.body !== null)) {
    await res.body?.cancel();
    return rejected("photo_fetch_failed");
  }
  const contentType = allowedPhotoContentType(res.headers.get("content-type"));
  if (contentType === null) {
    await res.body.cancel();
    return rejected("photo_unsupported_type");
  }
  if (exceedsPhotoSizeCap(res.headers.get("content-length"))) {
    await res.body.cancel();
    return rejected("photo_too_large");
  }
  return { body: limitBody(res.body), contentType, ok: true };
};

/**
 * Streams one of an activity's Strava photos through our origin. The image
 * URL is re-resolved server-side from Strava's photo list (the client only
 * supplies an activity id + index), so no client-controlled URL is ever
 * fetched, and the same-origin response keeps snapdom's export canvas
 * untainted. Even so, the list's URL is only followed when it's https on a
 * Strava photo CDN host, and only image bodies up to `PHOTO_MAX_BYTES` are
 * relayed (`lib/strava-photo-proxy.ts`).
 */
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const activity = url.searchParams.get("activity") ?? "";
  if (!NUMERIC_ID.test(activity)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const index = clampedIntParam(url.searchParams.get("index"), 0, 0, 100);

  try {
    const list = await stravaFetch(
      `/activities/${activity}/photos?size=${PHOTO_FULL_SIZE}&photo_sources=true`,
      StravaPhotoListSchema
    );
    const src = largestPhotoUrl(list.at(index)?.urls ?? undefined);
    if (!hasText(src)) {
      return NextResponse.json({ error: "photo_not_found" }, { status: 404 });
    }
    // The API frequently returns a mid-size rendition no matter what `size`
    // was requested, but the 2048-class rendition exists at the same CDN
    // path (it's what strava.com itself links). Try it first and fall back
    // to the URL the API actually gave us.
    const upgraded = upscaledPhotoUrl(src, PHOTO_TARGET_LONG_EDGE);
    // Sequential on purpose: the original URL is only fetched when the
    // upgraded rendition doesn't exist.
    let outcome = await fetchPhoto(upgraded ?? src);
    if (!outcome.ok && upgraded !== null) {
      outcome = await fetchPhoto(src);
    }
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.failure }, { status: 502 });
    }
    return new NextResponse(outcome.body, {
      headers: {
        "cache-control": "private, max-age=3600",
        "content-disposition": "inline",
        "content-type": outcome.contentType,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return stravaErrorResponse(error);
  }
};
