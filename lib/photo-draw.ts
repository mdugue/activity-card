// Export-time description of a photo layer.
//
// WebKit (Safari / every iOS browser) renders an SVG-as-image in a restricted
// context that refuses to load ANY subresource — including `data:` URIs. Every
// DOM-to-PNG pipeline, snapdom's included, rasterises through exactly such an
// SVG, so on iOS the background photo silently drops out of the export while
// text, gradients and vectors come through. The export pipeline works around it
// by painting the photo onto the output canvas itself
// (`theme/export/photo-composite.ts`) — which needs to know, per photo layer,
// exactly what the DOM would have painted.
//
// Rather than have the exporter reverse-engineer that from computed styles, the
// photo layers publish it: each one marks its (untransformed, unclipped)
// container with `data-effort-photo` carrying this descriptor, and the painting
// element itself with `data-effort-photo-paint` so the compositor can blank it
// while probing. Keeping the descriptor here — pure data + pure geometry — is
// what makes the composite testable without a browser.

import { coverSize } from "./image-transform";

/** Marks the layer container: untransformed, and clipped exactly like the
 *  photo's visible area (so filling it solid covers what the photo covers). */
export const PHOTO_LAYER_ATTR = "data-effort-photo";
/** Marks the element that actually paints the photo, inside the container. */
export const PHOTO_PAINT_ATTR = "data-effort-photo-paint";

/** Where the painting element sits inside its layer container: either an
 *  explicit box (CoverPhoto sizes its element to the image's cover footprint)
 *  or a uniform inset from the container's edges (CssCoverImage bleeds). */
export type PhotoBox =
  | { h: number; kind: "box"; w: number; x: number; y: number }
  | { inset: number; kind: "inset" };

export interface Rect {
  h: number;
  w: number;
  x: number;
  y: number;
}

/** Everything the exporter needs to repaint one photo layer onto a canvas. */
export interface PhotoDraw {
  box: PhotoBox;
  /** the painting element's own CSS `filter` ("" when none) */
  filter: string;
  flipH: boolean;
  flipV: boolean;
  /** the painting element's own opacity (container opacity is NOT included —
   *  the compositor's probes already capture that) */
  opacity: number;
  rotate: number;
  /** pan/zoom scale, applied about the box centre */
  scale: number;
  /** the photo source (an object URL) */
  src: string;
  /** pan translation in card px */
  x: number;
  y: number;
}

export function encodePhotoDraw(draw: PhotoDraw): string {
  return JSON.stringify(draw);
}

/** Parse a `data-effort-photo` payload. Returns null for anything malformed —
 *  a broken descriptor must degrade to "no composite", never throw mid-export. */
export function decodePhotoDraw(value: string | null): PhotoDraw | null {
  if (!value) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const d = parsed as Partial<PhotoDraw>;
  if (typeof d.src !== "string" || !d.box || typeof d.box !== "object") {
    return null;
  }
  const box = d.box;
  if (box.kind !== "box" && box.kind !== "inset") {
    return null;
  }
  return {
    box,
    filter: typeof d.filter === "string" ? d.filter : "",
    flipH: d.flipH === true,
    flipV: d.flipV === true,
    opacity: typeof d.opacity === "number" ? d.opacity : 1,
    rotate: typeof d.rotate === "number" ? d.rotate : 0,
    scale: typeof d.scale === "number" ? d.scale : 1,
    src: d.src,
    x: typeof d.x === "number" ? d.x : 0,
    y: typeof d.y === "number" ? d.y : 0,
  };
}

/** The painting element's box in container coordinates. */
export function resolvePhotoBox(
  box: PhotoBox,
  layerW: number,
  layerH: number
): Rect {
  if (box.kind === "box") {
    return { x: box.x, y: box.y, w: box.w, h: box.h };
  }
  return {
    x: box.inset,
    y: box.inset,
    w: layerW - 2 * box.inset,
    h: layerH - 2 * box.inset,
  };
}

/**
 * The image's `background-size: cover` footprint inside `box`, centred on it —
 * in coordinates relative to the box centre, which is also the element's
 * `transform-origin`. Drawing at this rect and clipping to the box reproduces
 * `background-size: cover; background-position: center`.
 */
export function coverRectAroundCentre(
  box: Rect,
  naturalW: number,
  naturalH: number
): Rect {
  if (!(naturalW > 0 && naturalH > 0)) {
    return { x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h };
  }
  const { w, h } = coverSize(box.w, box.h, naturalW, naturalH);
  return { x: -w / 2, y: -h / 2, w, h };
}
