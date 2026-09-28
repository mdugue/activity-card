import type { StravaPhotoRef } from "@/lib/activity";

import { leadingInt } from "./strava-params";

// Strava's photo CDN encodes the rendition's pixel size in the filename,
// e.g. `…-576x768.jpg` (portrait) / `…-2048x1536.jpg` (landscape).
// Matched without capture groups (named groups need an ES2018 target; the
// tsconfig is ES2017): `sizeSuffix` splits the matched suffix instead.
const CDN_SIZE_SUFFIX_RE = /-\d+x\d+\.(?:jpe?g|png|webp)$/iu;

interface SizeSuffix {
  ext: string;
  height: number;
  width: number;
}

/** Split a matched `-WxH.ext` suffix into its parts. */
const sizeSuffix = (suffix: string): SizeSuffix => {
  const dot = suffix.indexOf(".");
  const [width, height] = suffix.slice(1, dot).toLowerCase().split("x");
  return {
    ext: suffix.slice(dot),
    height: Number(height),
    width: Number(width),
  };
};

/**
 * Pick the largest rendition from a Strava photo's `urls` record (keyed by
 * pixel size, e.g. `{"600": …, "5000": …}`). Strava usually returns exactly
 * the requested size, but when it returns several — or a different bucket
 * than asked for — taking the first entry can silently land on a thumbnail.
 */
export const largestPhotoUrl = (
  urls?: Record<string, string>
): string | undefined => {
  if (urls === undefined) {
    return undefined;
  }
  let best: string | undefined;
  let bestSize = Number.NEGATIVE_INFINITY;
  for (const [key, url] of Object.entries(urls)) {
    const size = leadingInt(key);
    const rank = Number.isFinite(size) ? size : 0;
    if (rank > bestSize) {
      bestSize = rank;
      best = url;
    }
  }
  return best;
};

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
export const upscaledPhotoUrl = (
  src: string,
  target: number
): string | null => {
  const match = CDN_SIZE_SUFFIX_RE.exec(src);
  if (match === null) {
    return null;
  }
  // The size parts are all-digit, so `Number` reads them as `parseInt` would.
  const { ext, height: h, width: w } = sizeSuffix(match[0]);
  const long = Math.max(w, h);
  if (!(Number.isFinite(long) && long > 0) || long >= target) {
    return null;
  }
  const scale = target / long;
  return src.replace(
    CDN_SIZE_SUFFIX_RE,
    `-${Math.round(w * scale)}x${Math.round(h * scale)}${ext}`
  );
};

/**
 * Same-origin URL for the full-size variant of a Strava photo. Routing the
 * bytes through our own origin keeps the export canvas untainted (Strava's
 * CDN doesn't promise CORS) and keeps Strava URLs out of client state.
 */
export const stravaPhotoProxyUrl = (ref: StravaPhotoRef): string => {
  const qs = new URLSearchParams({
    activity: String(ref.activityId),
    index: String(ref.index),
  });
  return `/api/strava/photo?${qs}`;
};

/** Stable identity for a photo ref (thumb keys, selection highlighting). */
export const stravaPhotoKey = (ref: StravaPhotoRef): string =>
  `${ref.activityId}-${ref.index}`;

/**
 * Download the full-size photo through the proxy and wrap it as a File so it
 * flows through the exact pipeline an uploaded photo uses (object URL,
 * palette extraction, pan/zoom, export).
 */
export const fetchStravaPhotoFile = async (
  ref: StravaPhotoRef
): Promise<File> => {
  const res = await fetch(stravaPhotoProxyUrl(ref));
  if (!res.ok) {
    throw new Error("Could not load the photo from Strava.");
  }
  const blob = await res.blob();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  return new File([blob], `strava-photo-${stravaPhotoKey(ref)}.${ext}`, {
    type: blob.type || "image/jpeg",
  });
};
