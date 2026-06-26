// Carousel export. The deck is one continuous wide strip; we rasterise it once
// and slice it into n format-sized frames so the photo/route bleed lines up
// across cuts. The frame size is the chosen export format (4:5 feed by default),
// so the strip is `count × format.width` wide and `format.height` tall. Frames
// are delivered as an ordered set — shared together on mobile (Web Share API) or
// downloaded sequentially on desktop. Mirrors the single-card pipeline's
// font-ready wait and snapdom options.

import { snapdom } from "@zumer/snapdom";
import type { ExportFormat } from "@/theme/core/export-formats";
import { deliverFiles, effortDateSlug, waitForFonts } from "./export-shared";

const PIXEL_RATIO = 2; // each slide → 2× its format size, matching the single card
const MAX_CANVAS_DIM = 16_384; // conservative cross-browser canvas width cap

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Rasterise the wide strip node once and slice it into `count` format-sized
 *  frames. `format` is the chosen export format (4:5 feed by default). */
export async function exportCarousel(
  wideNode: HTMLElement,
  count: number,
  baseName: string,
  format: ExportFormat
): Promise<void> {
  await waitForFonts();

  const width = count * format.width;
  // Keep the rasterised strip under the canvas dimension cap — this now guards a
  // `count × format.width` strip, so a wide landscape strip would clamp sooner.
  const pr = Math.max(
    1,
    Math.min(PIXEL_RATIO, Math.floor(MAX_CANVAS_DIM / width))
  );
  // `embedFonts` inlines the deck's @font-face; `dpr: 1` keeps the strip a
  // deterministic `pr`× of its native size regardless of screen density (see
  // theme/export/export-card.ts for the full note).
  const canvas = await snapdom.toCanvas(wideNode, {
    width,
    height: format.height,
    scale: pr,
    dpr: 1,
    embedFonts: true,
  });

  const sliceW = format.width * pr;
  const sliceH = format.height * pr;
  const outW = format.width * PIXEL_RATIO;
  const outH = format.height * PIXEL_RATIO;

  // Draw every frame synchronously (which kicks off its PNG encode), then
  // collect them concurrently — toBlob is the slow part of export, so
  // overlapping the 3–4 encodes beats awaiting them one after another. The
  // frame index rides along so ordering/naming holds.
  const encodings: { blob: Promise<Blob | null>; index: number }[] = [];
  for (let i = 0; i < count; i++) {
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");
    if (!ctx) {
      // A null context means the browser refused the canvas (memory pressure,
      // too many live canvases). Delivering a partial set with a numbering gap
      // would look like success — fail loudly instead.
      throw new Error(`Carousel frame ${i + 1} could not be drawn`);
    }
    ctx.drawImage(canvas, i * sliceW, 0, sliceW, sliceH, 0, 0, outW, outH);
    encodings.push({
      index: i,
      blob: new Promise<Blob | null>((resolve) => {
        out.toBlob(resolve, "image/png");
      }),
    });
  }

  const files = await Promise.all(
    encodings.map(async ({ index, blob }) => {
      const resolved = await blob;
      if (!resolved) {
        // toBlob yields null on encode failure; a silently shrunken set would
        // ship a carousel with missing slides.
        throw new Error(`Carousel frame ${index + 1} failed to encode`);
      }
      return new File([resolved], `${baseName}_${pad2(index + 1)}.png`, {
        type: "image/png",
      });
    })
  );
  await deliverFiles(files, { title: "My Effort carousel", betweenMs: 350 });
}

/** "effort_ride_20260518_carousel" — slide index is appended at export. */
export function carouselBaseName(sport: string, date: string): string {
  return `effort_${sport}_${effortDateSlug(date)}_carousel`;
}
