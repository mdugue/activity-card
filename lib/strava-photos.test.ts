/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  largestPhotoUrl,
  stravaPhotoKey,
  stravaPhotoProxyUrl,
  upscaledPhotoUrl,
} from "@/lib/strava-photos";

const REF = { activityId: 1001, index: 2, previewUrl: "https://x/p.jpg" };

describe("stravaPhotoProxyUrl", () => {
  test("builds the same-origin proxy URL from the ref", () => {
    expect(stravaPhotoProxyUrl(REF)).toBe(
      "/api/strava/photo?activity=1001&index=2"
    );
  });
});

describe("largestPhotoUrl", () => {
  test("picks the biggest size bucket, not the first entry", () => {
    expect(
      largestPhotoUrl({ "100": "small", "5000": "big", "600": "mid" })
    ).toBe("big");
  });

  test("handles a single entry and missing input", () => {
    expect(largestPhotoUrl({ "600": "only" })).toBe("only");
    expect(largestPhotoUrl(undefined)).toBeUndefined();
    expect(largestPhotoUrl({})).toBeUndefined();
  });

  test("non-numeric keys rank below any numeric size", () => {
    expect(largestPhotoUrl({ default: "weird", "600": "sized" })).toBe("sized");
  });
});

describe("upscaledPhotoUrl", () => {
  // Real-world shape: the API hands out 576x768 while strava.com links the
  // 1536x2048 rendition at the same CDN path.
  const CDN = "https://dgtzuqphqg23d.cloudfront.net/y5PZuiSNV3yAT-abc";

  test("scales a portrait rendition to the 2048 long edge", () => {
    expect(upscaledPhotoUrl(`${CDN}-576x768.jpg`, 2048)).toBe(
      `${CDN}-1536x2048.jpg`
    );
  });

  test("scales a landscape rendition, preserving orientation", () => {
    expect(upscaledPhotoUrl(`${CDN}-768x576.jpg`, 2048)).toBe(
      `${CDN}-2048x1536.jpg`
    );
  });

  test("returns null at or above the target", () => {
    expect(upscaledPhotoUrl(`${CDN}-1536x2048.jpg`, 2048)).toBeNull();
    expect(upscaledPhotoUrl(`${CDN}-3000x4000.jpg`, 2048)).toBeNull();
  });

  test("returns null for URLs without a size suffix", () => {
    expect(upscaledPhotoUrl("https://x/photos/1001-0.png", 2048)).toBeNull();
    expect(upscaledPhotoUrl(`${CDN}-576x768.jpg?sig=abc`, 2048)).toBeNull();
  });
});

describe("stravaPhotoKey", () => {
  test("is stable per activity + index", () => {
    expect(stravaPhotoKey(REF)).toBe("1001-2");
    expect(stravaPhotoKey({ ...REF, index: 0 })).toBe("1001-0");
  });
});
