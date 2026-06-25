/**
 * Carousel Post mode — data model.
 *
 * A carousel is an ordered set of slides rendered onto one continuous wide strip
 * (count × slide) that is sliced into n frames on export — the photo and route
 * bleed across slide edges. Styling is deck-wide (driven by the chosen theme +
 * the shared accent), not per slide. The slide count is fixed per theme — it's
 * the length of the theme's `panels` array (most are 3, Frame/Press are 4) — so
 * a slide is just an index into the strip.
 *
 * The slide SIZE is format-aware — read it from `stripGeometry`/`useFormat`, not
 * from these constants. `SLIDE_W`/`SLIDE_H` are demoted to re-exports of the 4:5
 * feed master (the single source of truth in `theme/core/export-formats.ts`):
 * they remain the byte-identical default but no longer hardcode the only size.
 */

import { EXPORT_FORMATS } from "@/theme/core/export-formats";

/** How the route polyline is drawn — chosen per theme. */
export type RouteStyle = "poster" | "desaturated" | "highlighter";

/** Display/label font pairing — chosen per theme. */
export type FontPairId = "bold" | "grotesk" | "magazine" | "serif" | "syne";

/** Feed-master slide dimensions (1080 × 1350) — the default + baseline. Derived
 *  from the single source of truth, NOT hardcoded. Format-aware code reads its
 *  size from `stripGeometry` / `useStripGeometry` instead. */
export const SLIDE_W = EXPORT_FORMATS["instagram-feed"].width;
export const SLIDE_H = EXPORT_FORMATS["instagram-feed"].height;
