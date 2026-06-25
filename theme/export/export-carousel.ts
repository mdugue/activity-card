// Carousel export. The deck is one continuous wide strip; we rasterise it once
// and slice it into n 1080×1350 frames so the photo/route bleed lines up across
// cuts. Frames are delivered as an ordered set — shared together on mobile
// (Web Share API) or downloaded sequentially on desktop. Mirrors the
// single-card pipeline's font-ready wait and snapdom options.

import { snapdom } from "@zumer/snapdom";
import { SLIDE_H, SLIDE_W } from "@/theme/carousel/types";
import { effortDateSlug, isDesktopDevice, waitForFonts } from "./export-shared";

const PIXEL_RATIO = 2; // 1080×1350 → 2160×2700, matching the single card
const MAX_CANVAS_DIM = 16_384; // conservative cross-browser canvas width cap

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function triggerDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Share the whole set on mobile, else download each in order. */
async function deliver(files: File[]): Promise<void> {
  if (files.length === 0) {
    return;
  }
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (!isDesktopDevice() && nav?.canShare?.({ files })) {
    try {
      await nav.share({ files, title: "My Effort carousel" });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        return;
      }
      // fall through to downloads
    }
  }
  for (const file of files) {
    triggerDownload(file);
    // Browsers throttle back-to-back programmatic downloads; space them out.
    await delay(350);
  }
}

/** Rasterise the wide strip node once and slice it into `count` frames. */
export async function exportCarousel(
  wideNode: HTMLElement,
  count: number,
  baseName: string
): Promise<void> {
  await waitForFonts();

  const width = count * SLIDE_W;
  // Keep the rasterised strip under the canvas dimension cap.
  const pr = Math.max(
    1,
    Math.min(PIXEL_RATIO, Math.floor(MAX_CANVAS_DIM / width))
  );
  // `embedFonts` inlines the deck's @font-face; `dpr: 1` keeps the strip a
  // deterministic `pr`× of its native size regardless of screen density (see
  // lib/export-card.ts for the full note).
  const canvas = await snapdom.toCanvas(wideNode, {
    width,
    height: SLIDE_H,
    scale: pr,
    dpr: 1,
    embedFonts: true,
  });

  const sliceW = SLIDE_W * pr;
  const sliceH = SLIDE_H * pr;
  const outW = SLIDE_W * PIXEL_RATIO;
  const outH = SLIDE_H * PIXEL_RATIO;

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
  await deliver(files);
}

/** "effort_ride_20260518_carousel" — slide index is appended at export. */
export function carouselBaseName(sport: string, date: string): string {
  return `effort_${sport}_${effortDateSlug(date)}_carousel`;
}
