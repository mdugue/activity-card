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
