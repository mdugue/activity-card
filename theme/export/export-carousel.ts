// Carousel export. The deck is one continuous wide strip, so the photo/route
// bleed lines up across cuts; each slide is rasterised on its own through a
// slide-sized window onto that strip. The frame size is the chosen export
// format (4:5 feed by default), so the strip is `count × format.width` wide and
// `format.height` tall. Mirrors the single-card pipeline's font-ready wait and
// snapdom options; delivery is the caller's (`deliverFiles` / a ZIP).

import type { ExportFormat } from "@/theme/core/export-formats";

import { fromCallback, waitForFonts } from "./export-shared";
import { release } from "./photo-composite";
import { canvasToPng, rasterizeNode } from "./rasterize";

// Each slide → 2× its format size, matching the single card.
const PIXEL_RATIO = 2;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** The staged strip and the slide-sized window it sits in: the window clips
 *  the strip to one slide, and the strip shifts left to bring slide `i` in. */
export interface StripWindow {
  strip: HTMLElement;
  window: HTMLElement;
}

/** Rasterise and encode slide `index`, releasing its canvas straight after. */
const renderSlide = async (
  stage: StripWindow,
  index: number,
  format: ExportFormat,
  baseName: string
): Promise<File> => {
  stage.strip.style.marginLeft = `${-index * format.width}px`;
  const canvas = await rasterizeNode(stage.window, {
    height: format.height * PIXEL_RATIO,
    width: format.width * PIXEL_RATIO,
  });
  try {
    const blob = await canvasToPng(canvas);
    return new File([blob], `${baseName}_${pad2(index + 1)}.png`, {
      type: "image/png",
    });
  } finally {
    release(canvas);
  }
};

/** Render the staged strip as its `count` slide images, in order.
 *
 *  One slide at a time, each a capture of its own window onto the strip and
 *  each canvas released before the next is drawn: iOS caps a canvas at ~16.7
 *  megapixels and the tab's canvas memory well below a full strip plus its
 *  slices. Cutting one capture of the whole strip into slides with snapdom's
 *  `crop` is no way round it either — WebKit draws the cropped capture's HTML
 *  (text, marks) from the strip's origin, so every slide got the first one's
 *  overlay over its own photo. */
export const renderCarousel = async (
  stage: StripWindow,
  count: number,
  baseName: string,
  format: ExportFormat
): Promise<File[]> => {
  await waitForFonts();
  const files: File[] = [];
  try {
    for (let i = 0; i < count; i += 1) {
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- sequential on purpose: the slides share the one window, and one slide's canvas alive at a time is the iOS fix
      files.push(await renderSlide(stage, i, format, baseName));
    }
  } finally {
    stage.strip.style.marginLeft = "";
  }
  return files;
};

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
