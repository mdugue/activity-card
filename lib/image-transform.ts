/**
 * Pan/zoom transform applied to a user's background photo.
 *
 * Coordinates live in the card's native 1080×1350 space so the same transform
 * renders identically in the scaled live preview and in the full-size
 * html-to-image export mount. `scale` is relative to a `background-size: cover`
 * baseline (1 = the photo exactly covers the card), so the image always fills
 * the frame and translation is clamped to never reveal an edge.
 */

export interface ImageTransform {
  scale: number; // >= 1, relative to cover baseline
  x: number; // translation in card px (1080-space)
  y: number; // translation in card px (1350-space)
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
export function clampTransform(
  t: ImageTransform,
  width = CARD_WIDTH,
  height = CARD_HEIGHT
): ImageTransform {
  const scale = Math.min(Math.max(t.scale, MIN_SCALE), MAX_SCALE);
  const maxX = ((scale - 1) * width) / 2;
  const maxY = ((scale - 1) * height) / 2;
  return {
    scale,
    x: Math.min(Math.max(t.x, -maxX), maxX),
    y: Math.min(Math.max(t.y, -maxY), maxY),
  };
}

export function transformToCss(t: ImageTransform): string {
  return `translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) scale(${t.scale.toFixed(4)})`;
}

export function isIdentityTransform(t: ImageTransform): boolean {
  return t.scale === 1 && t.x === 0 && t.y === 0;
}
