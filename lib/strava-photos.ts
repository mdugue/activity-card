import type { StravaPhotoRef } from "@/lib/activity";

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
