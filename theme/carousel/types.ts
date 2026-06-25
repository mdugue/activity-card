/**
 * Carousel Post mode — data model.
 *
 * A carousel is an ordered set of slides rendered onto one continuous wide
 * canvas (n×1080 × 1350) that is sliced into n frames on export — the photo
 * and route bleed across slide edges. Styling is deck-wide (driven by the
 * chosen theme + the shared accent), not per slide. The slide count is fixed
 * per theme — it's the length of the theme's `panels` array (most are 3,
 * Frame/Press are 4) — so a slide is just an index into the strip.
 */

/** How the route polyline is drawn — chosen per theme. */
export type RouteStyle = "poster" | "desaturated" | "highlighter";

/** Display/label font pairing — chosen per theme. */
export type FontPairId = "bold" | "grotesk" | "magazine" | "serif" | "syne";

/** Slide dimensions — one Instagram portrait frame. */
export const SLIDE_W = 1080;
export const SLIDE_H = 1350;
