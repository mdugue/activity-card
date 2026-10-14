// Carousel export. The deck is one continuous wide strip; we capture it once
// and rasterise it as n format-sized frames so the photo/route bleed lines up
// across cuts. The frame size is the chosen export format (4:5 feed by default),
// so the strip is `count × format.width` wide and `format.height` tall. Frames
// are delivered as an ordered set — shared together on mobile (Web Share API) or
// downloaded sequentially on desktop. Mirrors the single-card pipeline's
// font-ready wait and snapdom options.

import type { ExportFormat } from "@/theme/core/export-formats";

import {
  deliverFiles,
  effortDateSlug,
  fromCallback,
  waitForFonts,
} from "./export-shared";
import { release } from "./photo-composite";
import type { RenderFrame } from "./photo-composite";
import { canvasToPng, rasterizeFrames, rasterizeNode } from "./rasterize";

// Each slide → 2× its format size, matching the single card.
const PIXEL_RATIO = 2;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Rasterise and encode slide `index`, releasing its canvas straight after. */
const renderSlide = async (
  renderFrame: RenderFrame,
  index: number,
  baseName: string
): Promise<File> => {
  const canvas = await renderFrame(index);
  try {
    const blob = await canvasToPng(canvas);
    return new File([blob], `${baseName}_${pad2(index + 1)}.png`, {
      type: "image/png",
    });
  } finally {
    release(canvas);
  }
};

/** Rasterise the wide strip node and slice it into `count` format-sized
 *  frames. `format` is the chosen export format (4:5 feed by default).
 *
 *  The strip is captured once but rasterised and encoded one slide at a time,
 *  each canvas released before the next is drawn: iOS caps a canvas at ~16.7
 *  megapixels and the tab's canvas memory well below a full strip plus its
 *  slices, and blowing either is what crashed the export on iPhone. */
export const exportCarousel = async (
  wideNode: HTMLElement,
  count: number,
  baseName: string,
  format: ExportFormat
): Promise<void> => {
  await waitForFonts();

  const renderFrame = await rasterizeFrames(wideNode, {
    frames: count,
    size: {
      height: format.height * PIXEL_RATIO,
      width: count * format.width * PIXEL_RATIO,
    },
  });

  const files: File[] = [];
  for (let i = 0; i < count; i += 1) {
    // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- sequential on purpose: one slide's canvas alive at a time is the iOS fix; running them together brings the crash back
    files.push(await renderSlide(renderFrame, i, baseName));
  }
  await deliverFiles(files, { betweenMs: 350, title: "My Effort carousel" });
};

/** "effort_ride_20260518_carousel" — slide index is appended at export. */
export const carouselBaseName = (sport: string, date: string): string =>
  `effort_${sport}_${effortDateSlug(date)}_carousel`;

/** The overview's preview width in pixels — enough for a sharp tile on a
 *  Retina screen, a fraction of the export's size. */
const PREVIEW_WIDTH = 1200;

/** Rasterise the whole strip once, small, as a JPEG for the export overview.
 *  The overview shows this image instead of a live, native-size strip: holding
 *  a live photo-backed strip on screen is what iOS Safari killed the tab for.
 *  Returns an object URL the caller revokes. */
export const renderCarouselPreview = async (
  wideNode: HTMLElement,
  count: number,
  format: ExportFormat
): Promise<string> => {
  await waitForFonts();
  const stripW = count * format.width;
  const scale = Math.min(1, PREVIEW_WIDTH / stripW);
  const canvas = await rasterizeNode(wideNode, {
    height: Math.round(format.height * scale),
    width: Math.round(stripW * scale),
  });
  try {
    const blob = await fromCallback<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });
    if (!blob) {
      throw new Error("The carousel preview could not be encoded");
    }
    return URL.createObjectURL(blob);
  } finally {
    release(canvas);
  }
};
