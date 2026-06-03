/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  clampCoverTransform,
  coverSize,
  IDENTITY_TRANSFORM,
  isIdentityTransform,
  transformToCss,
} from "@/lib/image-transform";

describe("coverSize", () => {
  test("scales by the larger ratio so the box is fully covered (cover by width)", () => {
    // Wide strip, square image → must scale to cover the width.
    const { w, h } = coverSize(4320, 1350, 1000, 1000);
    expect(w).toBeCloseTo(4320);
    expect(h).toBeCloseTo(4320);
    expect(w).toBeGreaterThanOrEqual(4320);
    expect(h).toBeGreaterThanOrEqual(1350);
  });

  test("covers by height when the image is wider than the box", () => {
    const { w, h } = coverSize(1000, 1000, 4000, 1000);
    expect(h).toBeCloseTo(1000);
    expect(w).toBeCloseTo(4000);
  });
});

describe("clampCoverTransform", () => {
  test("clamps scale into [1,4] and pan into the real cover overflow", () => {
    // Wide strip, square image → cover is 4320×4320: vertical slack ±1485 at
    // scale 1, but no horizontal slack.
    const c = clampCoverTransform(
      { scale: 1, x: 500, y: 5000 },
      4320,
      1350,
      1000,
      1000
    );
    expect(c.x).toBe(0);
    expect(c.y).toBeCloseTo(1485);

    expect(
      clampCoverTransform({ scale: 99, x: 0, y: 0 }, 4320, 1350, 1000, 1000)
        .scale
    ).toBe(4);
    expect(
      clampCoverTransform({ scale: 0.1, x: 0, y: 0 }, 4320, 1350, 1000, 1000)
        .scale
    ).toBe(1);
  });
});

describe("transformToCss", () => {
  test("formats translate (2dp) and scale (4dp)", () => {
    expect(transformToCss({ scale: 1.5, x: 10, y: -20 })).toBe(
      "translate(10.00px, -20.00px) scale(1.5000)"
    );
  });
});

describe("isIdentityTransform", () => {
  test("treats sub-pixel / sub-0.1% residuals as identity", () => {
    expect(isIdentityTransform(IDENTITY_TRANSFORM)).toBe(true);
    expect(isIdentityTransform({ scale: 1.0005, x: 0.3, y: -0.4 })).toBe(true);
    expect(isIdentityTransform({ scale: 1.5, x: 0, y: 0 })).toBe(false);
    expect(isIdentityTransform({ scale: 1, x: 12, y: 0 })).toBe(false);
  });
});
