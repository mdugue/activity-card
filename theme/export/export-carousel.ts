// Carousel export. The deck is one continuous wide strip, but iOS Safari will
// NOT apply an embedded @font-face when it rasterises an `<img>`-rendered SVG
// that is wider than its internal limit — and a strip is `count × format.width`
// (~3–6k px) wide, well past it, so the headline text in the export falls back
// to a system font (the photo, a raster, survives). A single-card export is only
// `format.width` (1080) wide and embeds fonts reliably. So we capture the strip
// the SAME way: one SLIDE at a time, through a slide-width clipping window slid
// across the full deck. Every snapdom SVG is then 1080-wide, like the single
// card, and the seamless bleed is preserved because each window shows the
// correctly-offset region of the SAME full-width composition. Frames are
// delivered as an ordered set — shared together on mobile (Web Share API) or
// downloaded sequentially on desktop.

import { preCache, snapdom } from "@zumer/snapdom";
import { stripGeometry } from "@/theme/carousel/geometry";
import type { ExportFormat } from "@/theme/core/export-formats";
import { deliverFiles, effortDateSlug, waitForFonts } from "./export-shared";

const PIXEL_RATIO = 2; // each slide → 2× its format size, matching the single card
const MAX_CANVAS_DIM = 16_384; // conservative cross-browser canvas width cap

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Rasterise the wide deck one SLIDE at a time and return a canvas per slide.
 *
 * `windowNode` is the deck's outer box (`stripW × slideH`); `shiftNode` is the
 * inner wrapper holding the live `CarouselDeck`. We shrink the window to one
 * slide, translate the deck so slide `i` sits in it, and capture — so the
 * snapdom SVG is only `slideW` wide (iOS embeds @font-face reliably at that
 * size). The window is restored afterwards so the on-screen tile is unchanged.
 *
 * `scale` is the output multiplier (export uses `PIXEL_RATIO`; previews a small
 * fraction). The caller owns the two nodes, so this never mounts a second deck —
 * peak memory stays one live deck plus its per-slide canvases.
 */
export async function captureCarouselFrames(
  windowNode: HTMLElement,
  shiftNode: HTMLElement,
  format: ExportFormat,
  count: number,
  scale: number
): Promise<HTMLCanvasElement[]> {
  const { slideW, slideH } = stripGeometry(format, count);

  // Warm snapdom's font + image cache once for the whole deck; WebKit/iOS can
  // otherwise drop the photo or fall back from the @font-face on a cold first
  // pass (snapdom #129 / #253).
  await preCache(windowNode, { embedFonts: true });

  const prevWidth = windowNode.style.width;
  const prevOverflow = windowNode.style.overflow;
  const prevTransform = shiftNode.style.transform;
  windowNode.style.width = `${slideW}px`;
  windowNode.style.overflow = "hidden";

  const opts = {
    width: slideW,
    height: slideH,
    scale,
    dpr: 1,
    embedFonts: true,
  } as const;

  const frames: HTMLCanvasElement[] = [];
  try {
    for (let i = 0; i < count; i++) {
      // Slide the full-width deck so slide i fills the window; two frames let
      // WebKit lay out + paint the translated photo/text before capture.
      shiftNode.style.transform = `translateX(${-i * slideW}px)`;
      await nextFrame();
      await nextFrame();
      // Discard a warm-up pass (iOS drops the photo/font on a node's first
      // capture), keep the second.
      await snapdom.toCanvas(windowNode, opts);
      frames.push(await snapdom.toCanvas(windowNode, opts));
    }
  } finally {
    windowNode.style.width = prevWidth;
    windowNode.style.overflow = prevOverflow;
    shiftNode.style.transform = prevTransform;
  }
  return frames;
}

/** Rasterise the strip into `count` format-sized frames (one snapdom capture per
 *  slide) and deliver them as an ordered PNG set. `format` is the chosen export
 *  format (4:5 feed by default). */
export async function exportCarousel(
  windowNode: HTMLElement,
  shiftNode: HTMLElement,
  count: number,
  baseName: string,
  format: ExportFormat
): Promise<void> {
  await waitForFonts();

  // Each frame is a single slide, so the canvas cap guards `format.width × pr`
  // (1080 × 2 = 2160) — far under the limit; clamps only for an extreme format.
  const pr = Math.max(
    1,
    Math.min(PIXEL_RATIO, Math.floor(MAX_CANVAS_DIM / format.width))
  );
  const frames = await captureCarouselFrames(
    windowNode,
    shiftNode,
    format,
    count,
    pr
  );

  // Encode every frame concurrently — toBlob is the slow part of export, so
  // overlapping the 3–4 PNG encodes beats awaiting them one after another.
  const files = await Promise.all(
    frames.map(
      (canvas, index) =>
        new Promise<File>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(
                new File([blob], `${baseName}_${pad2(index + 1)}.png`, {
                  type: "image/png",
                })
              );
            } else {
              // toBlob yields null on encode failure; a silently shrunken set
              // would ship a carousel with missing slides.
              reject(new Error(`Carousel frame ${index + 1} failed to encode`));
            }
          }, "image/png");
        })
    )
  );
  await deliverFiles(files, { title: "My Effort carousel", betweenMs: 350 });
}

/** "effort_ride_20260518_carousel" — slide index is appended at export. */
export function carouselBaseName(sport: string, date: string): string {
  return `effort_${sport}_${effortDateSlug(date)}_carousel`;
}
