// The single rasterisation entry point both export pipelines go through.
//
// Straight snapdom capture everywhere it works; on engines that drop bitmaps
// from an SVG-as-image (WebKit / iOS — the reason a photo-led card used to
// export with no background) the photo is composited onto the canvas instead.
// See `lib/svg-raster-support.ts` for the probe and
// `theme/export/photo-composite.ts` for the compositing itself.

import { snapdom } from "@zumer/snapdom";

import { canRasterizeEmbeddedImages } from "@/lib/svg-raster-support";

import { rasterizeWithPhotoComposite } from "./photo-composite";
import type { RasterSize } from "./photo-composite";

/** `?photoComposite=force` / `=off` overrides the probe — for e2e coverage of
 *  the fallback on engines that don't need it, and as a field escape hatch. */
function override(): "force" | "off" | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get(
    "photoComposite"
  );
  return value === "force" || value === "off" ? value : null;
}

async function needsComposite(): Promise<boolean> {
  const forced = override();
  if (forced) {
    return forced === "force";
  }
  return !(await canRasterizeEmbeddedImages());
}

/**
 * Rasterise a card / strip node to a canvas of exactly `size`.
 *
 * snapdom options, unchanged from when they lived in `export-card`:
 * - `embedFonts` inlines the theme's @font-face — a headline silently falling
 *   back to a system font is the failure mode.
 * - an explicit `width`/`height` *wins over* `scale` since snapdom v3, so the
 *   pixel ratio is baked into `size` by the caller.
 * - `dpr: 1` pins the output to the requested size; left at its default it
 *   tracks the viewer's screen density and a Retina display doubles it again.
 */
export async function rasterizeNode(
  node: HTMLElement,
  size: RasterSize
): Promise<HTMLCanvasElement> {
  const capture = (s: RasterSize) =>
    snapdom.toCanvas(node, {
      width: s.width,
      height: s.height,
      dpr: 1,
      embedFonts: true,
    });

  if (await needsComposite()) {
    // Never let the fallback be the reason an export fails: a card whose photo
    // didn't load, a browser that refuses the extra canvases — any of that
    // degrades to the straight capture rather than to no card at all.
    try {
      const composited = await rasterizeWithPhotoComposite(node, size, capture);
      if (composited) {
        return composited;
      }
    } catch {
      // fall through to the straight capture
    }
  }
  return await capture(size);
}

/** Encode a rasterised canvas as PNG bytes. */
export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) {
    throw new Error("The card could not be encoded as a PNG");
  }
  return blob;
}
