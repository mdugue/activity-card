// Carousel strip geometry — the deck's pixel dimensions, derived from the active
// export format (never hardcoded). The canvas reads the strip frame (count ×
// slide); each panel reads one slide frame. At the 4:5 feed master this is the
// legacy 1080 × 1350, so the strip stays byte-identical. The carousel offers the
// same formats as the single card — every format is just a different slide box.

import type { ExportFormat, SafeInsets } from "@/theme/core/export-formats";

export interface StripGeometry {
  slideH: number;
  slideW: number;
  stripW: number;
}

/** Pure strip geometry for a format + slide count (the non-React callers). */
export const stripGeometry = (
  format: ExportFormat,
  count: number
): StripGeometry => ({
  slideH: format.height,
  slideW: format.width,
  stripW: count * format.width,
});

/** The panel's natural margin, per side (was the flat `SLIDE_PAD`). `SafeArea`
 *  floors content to max(this, platform safe inset), so feed is unchanged
 *  (90 > 48) while a tall Story pushes content clear of the chrome. */
export const CAROUSEL_NATURAL_MARGIN = 90;

/** The panel's natural margin as a per-side inset. */
export const CAROUSEL_NATURAL_PAD: Partial<SafeInsets> = {
  bottom: CAROUSEL_NATURAL_MARGIN,
  left: CAROUSEL_NATURAL_MARGIN,
  right: CAROUSEL_NATURAL_MARGIN,
  top: CAROUSEL_NATURAL_MARGIN,
};

/** The full-width STRIP frame the canvas reads — count slides across, one tall. */
export const stripFormat = (
  format: ExportFormat,
  count: number
): ExportFormat => ({ ...format, width: count * format.width });
