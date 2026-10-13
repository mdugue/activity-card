// The single rasterisation entry point both export pipelines go through.
//
// Straight snapdom capture everywhere it works; on engines that drop bitmaps
// from an SVG-as-image (WebKit / iOS — the reason a photo-led card used to
// export with no background) the photo is composited onto the canvas instead.
// See `lib/svg-raster-support.ts` for the probe and
// `theme/export/photo-composite.ts` for the compositing itself.

import { snapdom } from "@zumer/snapdom";

import { canRasterizeEmbeddedImages } from "@/lib/svg-raster-support";

import { fromCallback } from "./export-shared";
import { frameSize, rasterizeWithPhotoComposite } from "./photo-composite";
import type {
  Capture,
  FrameGrid,
  RasterSize,
  RenderFrame,
} from "./photo-composite";

/** `?photoComposite=force` / `=off` overrides the probe — for e2e coverage of
 *  the fallback on engines that don't need it, and as a field escape hatch. */
const override = (): "force" | "off" | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get(
    "photoComposite"
  );
  return value === "force" || value === "off" ? value : null;
};

const needsComposite = async (): Promise<boolean> => {
  const forced = override();
  if (forced) {
    return forced === "force";
  }
  return !(await canRasterizeEmbeddedImages());
};

/**
 * Capture a card / strip node once and rasterise it frame by frame: frame `i`
 * is the i-th of `grid.frames` equal columns of the full `grid.size`.
 *
 * A carousel strip is never drawn whole. At 2× a four-slide feed strip is
 * 8640×2700 — 23 megapixels, past the ~16.7 MP a canvas may hold on iOS, and
 * the photo composite needs two of them plus the slides: Safari kills the tab
 * long before that adds up. snapdom's `crop` re-windows the captured SVG, so
 * each slide is rasterised on its own at its own size.
 *
 * snapdom options, unchanged from when they lived in `export-card`:
 * - `embedFonts` inlines the theme's @font-face — a headline silently falling
 *   back to a system font is the failure mode.
 * - an explicit `width`/`height` *wins over* `scale` since snapdom v3, so the
 *   pixel ratio is baked into `size` by the caller.
 * - `dpr: 1` pins the output to the requested size; left at its default it
 *   tracks the viewer's screen density and a Retina display doubles it again.
 */
export const rasterizeFrames = async (
  node: HTMLElement,
  grid: FrameGrid
): Promise<RenderFrame> => {
  const frame = frameSize(grid);
  const capture: Capture = async () => {
    const result = await snapdom(node, {
      dpr: 1,
      embedFonts: true,
      height: grid.size.height,
      width: grid.size.width,
    });
    if (grid.frames === 1) {
      return async () => await result.toCanvas();
    }
    // The crop window is in the capture's viewBox units; the logical box sits
    // at (contentX, contentY) inside any bleed.
    const { contentX, contentY, h0, w0 } = result.meta;
    const cropW = w0 / grid.frames;
    return async (index) =>
      await result.toCanvas({
        crop: {
          height: h0,
          width: cropW,
          x: contentX + index * cropW,
          y: contentY,
        },
        dpr: 1,
        height: frame.height,
        width: frame.width,
      });
  };

  if (await needsComposite()) {
    // Never let the fallback be the reason an export fails: a card whose photo
    // didn't load, a browser that refuses the extra canvases — any of that
    // degrades to the straight capture rather than to no card at all.
    try {
      const composited = await rasterizeWithPhotoComposite(node, grid, capture);
      if (composited) {
        // A frame whose merge fails still degrades to the straight capture,
        // taken once and only if some frame needs it.
        let straight: Promise<RenderFrame> | undefined;
        return async (index) => {
          try {
            return await composited(index);
          } catch {
            straight ??= capture();
            return await (
              await straight
            )(index);
          }
        };
      }
    } catch {
      // fall through to the straight capture
    }
  }
  return await capture();
};

/** Rasterise a single card node to a canvas of exactly `size`. */
export const rasterizeNode = async (
  node: HTMLElement,
  size: RasterSize
): Promise<HTMLCanvasElement> =>
  await (
    await rasterizeFrames(node, { frames: 1, size })
  )(0);

/** Encode a rasterised canvas as PNG bytes. */
export const canvasToPng = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  const blob = await fromCallback<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) {
    throw new Error("The card could not be encoded as a PNG");
  }
  return blob;
};
