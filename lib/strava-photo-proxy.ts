/**
 * Server-side guards for the `/api/strava/photo` proxy. The upstream URL
 * comes from Strava's photo list, not the client, but the proxy still
 * fetches whatever that list says and streams it from our origin — so it
 * only follows https URLs on Strava's photo CDN, only passes image types a
 * browser renders as images, and caps the body size.
 *
 * Pure helpers (no Next.js imports) so they're unit-testable with bun:test.
 */

import { hasText } from "./text";

/** Largest photo body the proxy will stream. Strava's biggest renditions
 * are a few MB; anything this large is not a photo we want to relay. */
export const PHOTO_MAX_BYTES = 25 * 1024 * 1024;

/** Content types the proxy passes through, normalised (no parameters). */
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** Hostname suffixes of Strava's photo CDNs. Activity photos are served
 * from CloudFront distributions (e.g. `dgtzuqphqg23d.cloudfront.net`),
 * whose ids Strava can rotate, so the whole `cloudfront.net` zone is
 * accepted rather than pinning one distribution; `strava.com` covers any
 * first-party host. */
const PHOTO_HOST_SUFFIXES = ["cloudfront.net", "strava.com"] as const;

const hostMatches = (host: string, suffix: string): boolean =>
  host === suffix || host.endsWith(`.${suffix}`);

/**
 * Is `raw` a URL the proxy may fetch? Accepts https on the default port,
 * without credentials, on a Strava photo CDN host. `trustedOrigin` (the
 * origin of the configured Strava API base) is accepted verbatim, protocol
 * included — it is what lets the E2E / local mock, which serves its photo
 * fixtures from the same `http://localhost` origin as its API, keep
 * working. In production the API base is `https://www.strava.com`, which
 * the CDN rule already covers.
 */
export const isAllowedPhotoUrl = (
  raw: string,
  trustedOrigin?: string
): boolean => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.username !== "" || url.password !== "") {
    return false;
  }
  if (hasText(trustedOrigin) && url.origin === trustedOrigin) {
    return true;
  }
  if (url.protocol !== "https:" || url.port !== "") {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return PHOTO_HOST_SUFFIXES.some((suffix) => hostMatches(host, suffix));
};

/** Normalise an upstream `content-type` and return it when it's one of
 * the allowed image types, `null` otherwise (missing, SVG, HTML, …). */
export const allowedPhotoContentType = (
  header: string | null
): string | null => {
  if (!hasText(header)) {
    return null;
  }
  const type = header.split(";")[0].trim().toLowerCase();
  return ALLOWED_PHOTO_TYPES.has(type) ? type : null;
};

/** `true` when a declared `content-length` exceeds `max`. A missing or
 * unparsable header is not "too large" — `limitBody` enforces the cap
 * while streaming in that case. */
export const exceedsPhotoSizeCap = (
  header: string | null,
  max: number = PHOTO_MAX_BYTES
): boolean => {
  if (!hasText(header)) {
    return false;
  }
  const length = Number(header);
  return Number.isFinite(length) && length > max;
};

/** Pass `body` through, erroring the stream once more than `max` bytes
 * have flowed — covers upstreams that omit or understate `content-length`. */
export const limitBody = (
  body: ReadableStream<Uint8Array>,
  max: number = PHOTO_MAX_BYTES
): ReadableStream<Uint8Array> => {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > max) {
          controller.error(new Error("photo_too_large"));
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );
};
