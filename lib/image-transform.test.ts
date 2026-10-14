/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import {
  cardPointToImage,
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

describe("cardPointToImage", () => {
  // A 2000×1000 photo covering a 1000×1000 box: drawn 2000×1000, half of each
  // side cropped.
  const g = {
    boxH: 1000,
    boxW: 1000,
    flipH: false,
    flipV: false,
    natH: 1000,
    natW: 2000,
    rotate: 0,
    transform: IDENTITY_TRANSFORM,
  };

  test("maps the box centre to the photo centre", () => {
    expect(cardPointToImage(500, 500, g)).toEqual({ u: 0.5, v: 0.5 });
  });

  test("accounts for the cover crop", () => {
    expect(cardPointToImage(0, 0, g)).toEqual({ u: 0.25, v: 0 });
  });

  test("undoes pan and zoom", () => {
    const zoomed = { ...g, transform: { scale: 2, x: 100, y: 0 } };
    // The photo centre moved 100px right; the box centre now shows a point
    // 50 unscaled px to its left.
    const p = cardPointToImage(500, 500, zoomed);
    expect(p?.u).toBeCloseTo(0.5 - 50 / 2000, 6);
    expect(p?.v).toBeCloseTo(0.5, 6);
  });

  test("undoes a mirror", () => {
    const p = cardPointToImage(0, 0, { ...g, flipH: true });
    expect(p?.u).toBeCloseTo(0.75, 6);
  });

  test("undoes a quarter turn", () => {
    // Rotated 90° clockwise the photo is 1000 wide × 2000 tall on screen, so
    // it covers the box at 1000×2000. The box's top-left corner shows the
    // photo's bottom-left region.
    const p = cardPointToImage(0, 500, { ...g, rotate: 90 });
    expect(p?.u).toBeCloseTo(0.5, 6);
    expect(p?.v).toBeCloseTo(1, 6);
  });

  test("returns null outside the photo", () => {
    const small = { ...g, natH: 1000, natW: 1000 };
    expect(cardPointToImage(-10, 500, small)).toBeNull();
  });
});
