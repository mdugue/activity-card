/**
 * Pan/zoom transform applied to a user's background photo.
 *
 * Coordinates live in the card's native 1080×1350 space so the same transform
 * renders identically in the scaled live preview and in the full-size
 * snapdom export mount. `scale` is relative to a `background-size: cover`
 * baseline (1 = the photo exactly covers the card), so the image always fills
 * the frame and translation is clamped to never reveal an edge.
 */

export interface ImageTransform {
  /** >= 1, relative to cover baseline */
  scale: number;
  /** translation in card px (1080-space) */
  x: number;
  /** translation in card px (1350-space) */
  y: number;
}

/** Rendered size (px) of an image scaled to cover a box. */
export interface CoverSize {
  h: number;
  w: number;
}

export const IDENTITY_TRANSFORM: ImageTransform = { scale: 1, x: 0, y: 0 };

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

/**
 * Clamp a transform so the scaled photo keeps covering the card. With a cover
 * baseline at scale 1, the slack on each axis is `(scale - 1) * dimension / 2`.
 */
export const clampTransform = (
  t: ImageTransform,
  width = CARD_WIDTH,
  height = CARD_HEIGHT
): ImageTransform => {
  const scale = Math.min(Math.max(t.scale, MIN_SCALE), MAX_SCALE);
  const maxX = ((scale - 1) * width) / 2;
  const maxY = ((scale - 1) * height) / 2;
  return {
    scale,
    x: Math.min(Math.max(t.x, -maxX), maxX),
    y: Math.min(Math.max(t.y, -maxY), maxY),
  };
};

export const transformToCss = (t: ImageTransform): string =>
  `translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) scale(${t.scale.toFixed(4)})`;

/**
 * The size an image is scaled to when it `cover`s a box, preserving aspect.
 * Used by the carousel panorama so the photo can be drawn at its true cover
 * size and panned within the real overflow.
 */
export const coverSize = (
  boxW: number,
  boxH: number,
  natW: number,
  natH: number
): CoverSize => {
  const scale = Math.max(boxW / natW, boxH / natH);
  return { h: natH * scale, w: natW * scale };
};

/**
 * Clamp a transform against the actual cover overflow of an image in a box —
 * unlike `clampTransform`, which assumes scale-1 exactly fills the box. With a
 * wide carousel strip and a normal photo there's real vertical slack at scale
 * 1, so this lets the user pan vertically (which `clampTransform` forbids).
 */
export const clampCoverTransform = (
  t: ImageTransform,
  boxW: number,
  boxH: number,
  natW: number,
  natH: number
): ImageTransform => {
  const scale = Math.min(Math.max(t.scale, MIN_SCALE), MAX_SCALE);
  const base = coverSize(boxW, boxH, natW, natH);
  const maxX = Math.max(0, (base.w * scale - boxW) / 2);
  const maxY = Math.max(0, (base.h * scale - boxH) / 2);
  return {
    scale,
    x: Math.min(Math.max(t.x, -maxX), maxX),
    y: Math.min(Math.max(t.y, -maxY), maxY),
  };
};

export const isIdentityTransform = (t: ImageTransform): boolean =>
  // Pointer/wheel gestures leave tiny floating-point residuals, so compare with
  // small epsilons — sub-pixel translation and a <0.1% scale delta read as
  // "effectively reset" (e.g. keeps the Reset button disabled).
  Math.abs(t.scale - 1) < 1e-3 && Math.abs(t.x) < 0.5 && Math.abs(t.y) < 0.5;

export interface ImagePointGeometry {
  boxH: number;
  boxW: number;
  flipH: boolean;
  flipV: boolean;
  /** natural photo size */
  natH: number;
  natW: number;
  /** clockwise degrees, a multiple of 90 */
  rotate: number;
  transform: ImageTransform;
}

/**
 * Where a point on the card lands on the photo, as 0–1 image coordinates —
 * the inverse of how `CoverPhoto` draws it (cover-fit centred in the box, then
 * pan/zoom, rotate and mirror about the centre). Null when the point falls
 * outside the photo.
 */
export const cardPointToImage = (
  px: number,
  py: number,
  g: ImagePointGeometry
): { u: number; v: number } | null => {
  const quarter = g.rotate % 180 !== 0;
  const base = coverSize(
    g.boxW,
    g.boxH,
    quarter ? g.natH : g.natW,
    quarter ? g.natW : g.natH
  );
  // The element keeps the image's own aspect; a quarter turn swaps its sides.
  const elW = quarter ? base.h : base.w;
  const elH = quarter ? base.w : base.h;
  // Undo the pan and zoom about the box centre…
  const qx = (px - g.boxW / 2 - g.transform.x) / g.transform.scale;
  const qy = (py - g.boxH / 2 - g.transform.y) / g.transform.scale;
  // …then the clockwise rotation (CSS y points down)…
  const rad = (-g.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  let ex = qx * cos - qy * sin;
  let ey = qx * sin + qy * cos;
  // …then the mirror.
  if (g.flipH) {
    ex = -ex;
  }
  if (g.flipV) {
    ey = -ey;
  }
  const u = ex / elW + 0.5;
  const v = ey / elH + 0.5;
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return null;
  }
  return { u, v };
};
