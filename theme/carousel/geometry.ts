// Carousel strip geometry — the single source of truth for the deck's pixel
// dimensions, DERIVED from the active export format (never hardcoded). The strip
// is two nested coordinate systems that both read the one `FormatContext`:
//
//   • the CANVAS spans the whole strip (count × slide) and bleeds across every
//     slide edge — it reads the STRIP frame;
//   • each PANEL occupies one slide frame, kept clear of the platform safe zone
//     — it reads the SLIDE frame.
//
// `stripGeometry` is the pure form for the non-React callers (the slicing export
// pipeline + the off-screen mount sizing); `useStripGeometry` reads the active
// format from `FormatContext` for the render tree. At the 4:5 feed master this
// resolves to the legacy 1080 × 1350 slide, so the strip stays byte-identical.

import {
  type AspectBucket,
  EXPORT_FORMATS,
  type ExportFormat,
  type SafeInsets,
} from "@/theme/core/export-formats";
import { useFormat } from "@/theme/shared/format-context";

/** The 4:5 feed master — the carousel's default + the byte-identical baseline. */
export const FEED_MASTER: ExportFormat = EXPORT_FORMATS["instagram-feed"];

export interface StripGeometry {
  /** aspect bucket of the active format (feed / square / story / landscape) */
  bucket: AspectBucket;
  /** the active format itself — handed down to the per-slide providers */
  format: ExportFormat;
  /** platform safe insets for ONE slide, in slide-space px (per-side keep-out) */
  safe: SafeInsets;
  /** one slide's height (= the format height) */
  slideH: number;
  /** one slide's width (= the format width) */
  slideW: number;
  /** the whole strip's width: count × slideW */
  stripW: number;
}

/** Pure strip geometry for a format + slide count — no React, no context. */
export function stripGeometry(
  format: ExportFormat,
  count: number
): StripGeometry {
  return {
    format,
    slideW: format.width,
    slideH: format.height,
    stripW: count * format.width,
    safe: format.safe,
    bucket: format.bucket,
  };
}

/** Strip geometry for the active format (from `FormatContext`) + slide count. */
export function useStripGeometry(count: number): StripGeometry {
  return stripGeometry(useFormat(), count);
}

/** The panel's own aesthetic margin, per side — the value the flat `SLIDE_PAD`
 *  used to be, named once. Each panel floors its content to the LARGER of this
 *  and the platform safe inset (`mergeSafe` inside `SafeArea`), so the 4:5 feed
 *  master is unchanged (90 > 48) while a tall Story / cover-cropped Strava pushes
 *  content clear of the platform chrome. */
export const CAROUSEL_NATURAL_MARGIN = 90;

/** Per-slide platform safe insets. A slide is one format frame shown on its own
 *  (the platform windows one slide at a time), so it keeps the same occlusion a
 *  single post does. Per-edge refinement — e.g. relaxing the seam side on the
 *  interior slides — is a deliberate future extension, not v1. */
export function slideSafe(format: ExportFormat): SafeInsets {
  return format.safe;
}

/** The full-width STRIP frame the CANVAS reads (count slides across, one slide
 *  tall). Provided at the deck level so a canvas reading `useFormat()` sees the
 *  whole strip. */
export function stripFormat(format: ExportFormat, count: number): ExportFormat {
  return { ...format, width: count * format.width };
}

/** The one-slide frame a PANEL reads — its own size + per-slide safe insets.
 *  Provided per slide slot so `SafeArea`/`useSafeInsets` floor content to the
 *  slide's keep-out. */
export function slideFormat(format: ExportFormat): ExportFormat {
  return { ...format, safe: slideSafe(format) };
}
