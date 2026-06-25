// Carousel strip geometry — the deck's pixel dimensions, derived from the active
// export format (never hardcoded). The canvas reads the strip frame (count ×
// slide); each panel reads one slide frame. At the 4:5 feed master this is the
// legacy 1080 × 1350, so the strip stays byte-identical.

import {
  EXPORT_FORMATS,
  type ExportFormat,
  type ExportFormatId,
} from "@/theme/core/export-formats";
import { useFormat } from "@/theme/shared/format-context";

/** The formats the carousel offers — one per aspect bucket, NOT the full
 *  `FORMAT_ORDER`: a 9:16 / 16:9 slide re-proportions the canvases, so v1 sticks
 *  to these validated, safe-correct shapes (redundant 9:16 variants omitted). */
export const CAROUSEL_FORMAT_ORDER: ExportFormatId[] = [
  "instagram-feed", // 4:5 (default + baseline)
  "square", // 1:1
  "instagram-story", // 9:16
  "x-landscape", // 16:9
];

/** Clamp a format to one the carousel offers — the shared preview format may
 *  carry a single-card-only bucket (e.g. tiktok); fall back to feed. */
export function carouselFormat(format: ExportFormat): ExportFormat {
  return (CAROUSEL_FORMAT_ORDER as string[]).includes(format.id)
    ? format
    : EXPORT_FORMATS["instagram-feed"];
}

export interface StripGeometry {
  slideH: number;
  slideW: number;
  stripW: number;
}

/** Pure strip geometry for a format + slide count (the non-React callers). */
export function stripGeometry(
  format: ExportFormat,
  count: number
): StripGeometry {
  return {
    slideW: format.width,
    slideH: format.height,
    stripW: count * format.width,
  };
}

/** Strip geometry for the active format (from `FormatContext`) + slide count. */
export function useStripGeometry(count: number): StripGeometry {
  return stripGeometry(useFormat(), count);
}

/** The panel's natural margin, per side (was the flat `SLIDE_PAD`). `SafeArea`
 *  floors content to max(this, platform safe inset), so feed is unchanged
 *  (90 > 48) while a tall Story pushes content clear of the chrome. */
export const CAROUSEL_NATURAL_MARGIN = 90;

/** The full-width STRIP frame the canvas reads — count slides across, one tall. */
export function stripFormat(format: ExportFormat, count: number): ExportFormat {
  return { ...format, width: count * format.width };
}
