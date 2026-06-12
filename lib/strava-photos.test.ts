/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { stravaPhotoKey, stravaPhotoProxyUrl } from "@/lib/strava-photos";

const REF = { activityId: 1001, index: 2, previewUrl: "https://x/p.jpg" };

describe("stravaPhotoProxyUrl", () => {
  test("builds the same-origin proxy URL from the ref", () => {
    expect(stravaPhotoProxyUrl(REF)).toBe(
      "/api/strava/photo?activity=1001&index=2"
    );
  });
});

describe("stravaPhotoKey", () => {
  test("is stable per activity + index", () => {
    expect(stravaPhotoKey(REF)).toBe("1001-2");
    expect(stravaPhotoKey({ ...REF, index: 0 })).toBe("1001-0");
  });
});
