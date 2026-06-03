/**
 * Carousel Post mode — data model.
 *
 * A carousel is an ordered set of slides rendered onto one continuous wide
 * canvas (n×1080 × 1350) that is sliced into n frames on export — the photo
 * and route bleed across slide edges. Styling is deck-wide (driven by the
 * chosen theme + the shared accent), not per slide. The slide sequence (deck)
 * is fixed per theme (most are 3 slides, Frame/Press are 4) — see
 * `theme-tokens.ts` — so a slide only carries its id and template (layout).
 */

/** Within-slide composition. The route silhouette spans the whole seamless
 *  strip (drawn globally), so it isn't a per-slide template; each slide is a
 *  type/stats layout the route threads through. */
export type SlideTemplate = "hero" | "statRow" | "statGrid" | "editorial";

/** How the route polyline is drawn — chosen per theme. */
export type RouteStyle = "poster" | "desaturated" | "highlighter";

/** Display/label font pairing — chosen per theme. */
export type FontPairId = "bold" | "grotesk" | "magazine" | "serif";

export interface Slide {
  id: string;
  template: SlideTemplate;
}

/** Slide dimensions — one Instagram portrait frame. */
export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

/** Build a theme's slides with deterministic ids (stable across renders). */
export function buildDeck(templates: SlideTemplate[]): Slide[] {
  return templates.map((template, i) => ({
    id: `slide-${i}-${template}`,
    template,
  }));
}
