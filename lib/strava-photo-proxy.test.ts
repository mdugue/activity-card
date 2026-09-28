/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import {
  allowedPhotoContentType,
  exceedsPhotoSizeCap,
  isAllowedPhotoUrl,
  limitBody,
  PHOTO_MAX_BYTES,
} from "@/lib/strava-photo-proxy";

describe("isAllowedPhotoUrl", () => {
  test("accepts https on Strava's CloudFront photo CDN", () => {
    expect(
      isAllowedPhotoUrl(
        "https://dgtzuqphqg23d.cloudfront.net/abc-1536x2048.jpg"
      )
    ).toBe(true);
  });

  test("accepts strava.com and its subdomains over https", () => {
    expect(isAllowedPhotoUrl("https://strava.com/x.jpg")).toBe(true);
    expect(isAllowedPhotoUrl("https://photos.strava.com/x.jpg")).toBe(true);
  });

  test("rejects plain http, even on an allowed host", () => {
    expect(isAllowedPhotoUrl("http://dgtzuqphqg23d.cloudfront.net/a.jpg")).toBe(
      false
    );
  });

  test("rejects other hosts and look-alike suffixes", () => {
    expect(isAllowedPhotoUrl("https://evil.example/a.jpg")).toBe(false);
    expect(isAllowedPhotoUrl("https://evilcloudfront.net/a.jpg")).toBe(false);
    expect(isAllowedPhotoUrl("https://strava.com.evil.example/a.jpg")).toBe(
      false
    );
    expect(isAllowedPhotoUrl("https://169.254.169.254/latest")).toBe(false);
  });

  test("rejects non-default ports, credentials and garbage", () => {
    expect(isAllowedPhotoUrl("https://x.cloudfront.net:8443/a.jpg")).toBe(
      false
    );
    expect(isAllowedPhotoUrl("https://user:pw@x.cloudfront.net/a.jpg")).toBe(
      false
    );
    expect(isAllowedPhotoUrl("not a url")).toBe(false);
    expect(isAllowedPhotoUrl("file:///etc/passwd")).toBe(false);
  });

  test("accepts the trusted API origin verbatim (E2E / local mock)", () => {
    const mock = "http://localhost:3101";
    expect(isAllowedPhotoUrl(`${mock}/photos/1001-0.png`, mock)).toBe(true);
    // …but only that exact origin, and never without it being passed.
    expect(isAllowedPhotoUrl("http://localhost:3102/p.png", mock)).toBe(false);
    expect(isAllowedPhotoUrl(`${mock}/photos/1001-0.png`)).toBe(false);
  });
});

describe("allowedPhotoContentType", () => {
  test("normalises and accepts raster image types", () => {
    expect(allowedPhotoContentType("image/jpeg")).toBe("image/jpeg");
    expect(allowedPhotoContentType("IMAGE/PNG; charset=binary")).toBe(
      "image/png"
    );
    expect(allowedPhotoContentType("image/webp")).toBe("image/webp");
    expect(allowedPhotoContentType("image/avif")).toBe("image/avif");
  });

  test("rejects missing, scriptable and non-image types", () => {
    expect(allowedPhotoContentType(null)).toBeNull();
    expect(allowedPhotoContentType("")).toBeNull();
    expect(allowedPhotoContentType("image/svg+xml")).toBeNull();
    expect(allowedPhotoContentType("text/html")).toBeNull();
    expect(allowedPhotoContentType("application/octet-stream")).toBeNull();
  });
});

describe("exceedsPhotoSizeCap", () => {
  test("flags a declared length over the cap", () => {
    expect(exceedsPhotoSizeCap(String(PHOTO_MAX_BYTES + 1))).toBe(true);
    expect(exceedsPhotoSizeCap("11", 10)).toBe(true);
  });

  test("passes lengths at or under the cap, and missing/garbage headers", () => {
    expect(exceedsPhotoSizeCap(String(PHOTO_MAX_BYTES))).toBe(false);
    expect(exceedsPhotoSizeCap(null)).toBe(false);
    expect(exceedsPhotoSizeCap("nope")).toBe(false);
  });
});

describe("limitBody", () => {
  const streamOf = (...chunks: number[]): ReadableStream<Uint8Array> =>
    new ReadableStream({
      start(controller) {
        for (const size of chunks) {
          controller.enqueue(new Uint8Array(size));
        }
        controller.close();
      },
    });

  test("passes a body within the cap through unchanged", async () => {
    const out = await new Response(limitBody(streamOf(4, 6), 10)).arrayBuffer();
    expect(out.byteLength).toBe(10);
  });

  test("errors the stream once the cap is exceeded", async () => {
    let message = "";
    try {
      await new Response(limitBody(streamOf(6, 6), 10)).arrayBuffer();
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe("photo_too_large");
  });
});
