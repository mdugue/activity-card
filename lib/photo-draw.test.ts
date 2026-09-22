import { describe, expect, test } from "bun:test";

import {
  coverRectAroundCentre,
  decodePhotoDraw,
  encodePhotoDraw,
  resolvePhotoBox,
} from "@/lib/photo-draw";
import type { PhotoDraw } from "@/lib/photo-draw";

const DRAW: PhotoDraw = {
  box: { kind: "box", x: -60, y: 0, w: 1200, h: 1350 },
  filter: "grayscale(1)",
  flipH: true,
  flipV: false,
  opacity: 0.55,
  rotate: 90,
  scale: 1.4,
  src: "blob:http://localhost/abc",
  x: 12,
  y: -8,
};

describe("photo-draw descriptor", () => {
  test("round-trips through the data attribute", () => {
    expect(decodePhotoDraw(encodePhotoDraw(DRAW))).toEqual(DRAW);
  });

  test("degrades to null rather than throwing on junk", () => {
    expect(decodePhotoDraw(null)).toBeNull();
    expect(decodePhotoDraw("")).toBeNull();
    expect(decodePhotoDraw("{not json")).toBeNull();
    expect(decodePhotoDraw("[]")).toBeNull();
    expect(decodePhotoDraw('{"src":"blob:x"}')).toBeNull();
    expect(
      decodePhotoDraw('{"src":"blob:x","box":{"kind":"nope"}}')
    ).toBeNull();
  });

  test("fills in defaults for a minimal descriptor", () => {
    const decoded = decodePhotoDraw(
      '{"src":"blob:x","box":{"kind":"inset","inset":0}}'
    );
    expect(decoded).toEqual({
      box: { kind: "inset", inset: 0 },
      filter: "",
      flipH: false,
      flipV: false,
      opacity: 1,
      rotate: 0,
      scale: 1,
      src: "blob:x",
      x: 0,
      y: 0,
    });
  });
});

describe("resolvePhotoBox", () => {
  test("passes an explicit box through untouched", () => {
    expect(resolvePhotoBox(DRAW.box, 1080, 1350)).toEqual({
      x: -60,
      y: 0,
      w: 1200,
      h: 1350,
    });
  });

  test("expands an inset box against the measured layer", () => {
    // A negative inset bleeds outward on every side — the same over-bleed
    // CssCoverImage uses so a rotated photo still covers its container.
    expect(resolvePhotoBox({ kind: "inset", inset: -40 }, 1080, 1350)).toEqual({
      x: -40,
      y: -40,
      w: 1160,
      h: 1430,
    });
    expect(resolvePhotoBox({ kind: "inset", inset: 0 }, 1080, 1350)).toEqual({
      x: 0,
      y: 0,
      w: 1080,
      h: 1350,
    });
  });
});

describe("coverRectAroundCentre", () => {
  const box = { x: 0, y: 0, w: 1080, h: 1350 };

  test("matches background-size: cover for a landscape photo", () => {
    // 2048×1536 covering 1080×1350 scales by height (1350/1536).
    const rect = coverRectAroundCentre(box, 2048, 1536);
    expect(rect.h).toBeCloseTo(1350, 5);
    expect(rect.w).toBeCloseTo(1800, 5);
    // Centred on the box centre, which is also the transform origin.
    expect(rect.x).toBeCloseTo(-900, 5);
    expect(rect.y).toBeCloseTo(-675, 5);
  });

  test("fills exactly when the box already has the photo's aspect", () => {
    const rect = coverRectAroundCentre(box, 1080 * 3, 1350 * 3);
    expect(rect.w).toBeCloseTo(1080, 5);
    expect(rect.h).toBeCloseTo(1350, 5);
  });

  test("falls back to the box when the natural size is unknown", () => {
    expect(coverRectAroundCentre(box, 0, 0)).toEqual({
      x: -540,
      y: -675,
      w: 1080,
      h: 1350,
    });
  });
});
