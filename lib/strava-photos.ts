import type { StravaPhotoRef } from "@/lib/activity";

// Strava's photo CDN encodes the rendition's pixel size in the filename,
// e.g. `…-576x768.jpg` (portrait) / `…-2048x1536.jpg` (landscape).
const CDN_SIZE_SUFFIX_RE = /-(\d+)x(\d+)(\.(?:jpe?g|png|webp))$/i;

/**
 * Pick the largest rendition from a Strava photo's `urls` record (keyed by
 * pixel size, e.g. `{"600": …, "5000": …}`). Strava usually returns exactly
 * the requested size, but when it returns several — or a different bucket
 * than asked for — taking the first entry can silently land on a thumbnail.
 */
export function largestPhotoUrl(
  urls: Record<string, string> | undefined
): string | undefined {
  if (!urls) {
    return;
  }
  let best: string | undefined;
  let bestSize = Number.NEGATIVE_INFINITY;
  for (const [key, url] of Object.entries(urls)) {
    const size = Number.parseInt(key, 10);
    const rank = Number.isFinite(size) ? size : 0;
    if (rank > bestSize) {
      bestSize = rank;
      best = url;
    }
  }
  return best;
}

/**
 * Strava's CDN stores several pre-generated renditions of each photo at the
 * same path, differing only in the `-WxH` filename suffix — and the API
 * often hands out a mid-size rendition (`…-576x768.jpg`) no matter what
 * `size` was requested, while the web app links the 2048-class one
 * (`…-1536x2048.jpg`). Rewrite the suffix so the long edge hits `target`,
 * preserving the aspect ratio. Returns `null` when the URL doesn't carry a
 * size suffix or is already at/above the target — callers must treat the
 * rewritten URL as a *candidate* (fetch may 404 for non-standard renditions)
 * and fall back to the original.
 */
export function upscaledPhotoUrl(src: string, target: number): string | null {
  const match = src.match(CDN_SIZE_SUFFIX_RE);
  if (!match) {
    return null;
  }
  const w = Number.parseInt(match[1], 10);
  const h = Number.parseInt(match[2], 10);
  const long = Math.max(w, h);
  if (!(Number.isFinite(long) && long > 0) || long >= target) {
    return null;
  }
  const scale = target / long;
  return src.replace(
    CDN_SIZE_SUFFIX_RE,
    `-${Math.round(w * scale)}x${Math.round(h * scale)}${match[3]}`
  );
}

/**
 * Same-origin URL for the full-size variant of a Strava photo. Routing the
 * bytes through our own origin keeps the export canvas untainted (Strava's
 * CDN doesn't promise CORS) and keeps Strava URLs out of client state.
 */
export function stravaPhotoProxyUrl(ref: StravaPhotoRef): string {
  const qs = new URLSearchParams({
    activity: String(ref.activityId),
    index: String(ref.index),
  });
  return `/api/strava/photo?${qs}`;
}

/** Stable identity for a photo ref (thumb keys, selection highlighting). */
export function stravaPhotoKey(ref: StravaPhotoRef): string {
  return `${ref.activityId}-${ref.index}`;
}

/**
 * Download the full-size photo through the proxy and wrap it as a File so it
 * flows through the exact pipeline an uploaded photo uses (object URL,
 * palette extraction, pan/zoom, export).
 */
export async function fetchStravaPhotoFile(ref: StravaPhotoRef): Promise<File> {
  const res = await fetch(stravaPhotoProxyUrl(ref));
  if (!res.ok) {
    throw new Error("Could not load the photo from Strava.");
  }
  const blob = await res.blob();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  return new File([blob], `strava-photo-${stravaPhotoKey(ref)}.${ext}`, {
    type: blob.type || "image/jpeg",
  });
}
