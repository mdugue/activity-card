// Carousel Post mode — shared types + the feed-master slide size. The live
// slide size is format-aware (read it from `stripGeometry`/`useFormat`);
// `SLIDE_W`/`SLIDE_H` are just re-exports of the 4:5 feed master baseline.

import { EXPORT_FORMATS } from "@/theme/core/export-formats";

/** How the route polyline is drawn — chosen per theme. */
export type RouteStyle = "poster" | "desaturated" | "highlighter";

/** Display/label font pairing — chosen per theme. */
export type FontPairId = "bold" | "grotesk" | "magazine" | "serif" | "syne";

/** Feed-master slide dimensions (1080 × 1350) — the default + baseline. */
export const SLIDE_W = EXPORT_FORMATS["instagram-feed"].width;
export const SLIDE_H = EXPORT_FORMATS["instagram-feed"].height;
