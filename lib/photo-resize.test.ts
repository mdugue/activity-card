import { describe, expect, test } from "bun:test";

import {
  cappedPhotoSize,
  MAX_PHOTO_EDGE,
  MAX_PHOTO_PIXELS,
} from "@/lib/photo-resize";

describe("cappedPhotoSize", () => {
  test("leaves a photo the export can use alone", () => {
    expect(cappedPhotoSize(2048, 1536)).toEqual({ w: 2048, h: 1536 });
    // Exactly the tallest export (1080×1920 at 2×) still passes untouched.
    expect(cappedPhotoSize(2160, 3840)).toEqual({ w: 2160, h: 3840 });
  });

  test("shrinks the long edge of an oversized Strava rendition", () => {
    // Strava serves up to 5000px — ~19 MP, the case a phone can't decode.
    const capped = cappedPhotoSize(5000, 3750);
    expect(Math.max(capped.w, capped.h)).toBeLessThanOrEqual(MAX_PHOTO_EDGE);
    expect(capped.w * capped.h).toBeLessThanOrEqual(MAX_PHOTO_PIXELS);
    // Aspect is preserved.
    expect(capped.w / capped.h).toBeCloseTo(5000 / 3750, 2);
  });

  test("applies the pixel ceiling even when both edges are legal", () => {
    // 3800×3800 is under the edge limit but 14.4 MP.
    const capped = cappedPhotoSize(3800, 3800);
    expect(capped.w * capped.h).toBeLessThanOrEqual(MAX_PHOTO_PIXELS);
    expect(capped.w).toBe(capped.h);
  });

  test("keeps a panorama's long edge in check", () => {
    const capped = cappedPhotoSize(9000, 1200);
    expect(capped.w).toBe(MAX_PHOTO_EDGE);
    expect(capped.h).toBe(512);
  });

  test("passes degenerate sizes through untouched", () => {
    expect(cappedPhotoSize(0, 0)).toEqual({ w: 0, h: 0 });
  });
});
