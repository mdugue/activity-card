/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  largestPhotoUrl,
  stravaPhotoKey,
  stravaPhotoProxyUrl,
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

describe("stravaPhotoKey", () => {
  test("is stable per activity + index", () => {
    expect(stravaPhotoKey(REF)).toBe("1001-2");
    expect(stravaPhotoKey({ ...REF, index: 0 })).toBe("1001-0");
  });
});
