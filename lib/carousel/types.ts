/**
 * Carousel Post mode — data model.
 *
 * A carousel is an ordered set of slides rendered onto one continuous wide
 * canvas (n×1080 × 1350) that is sliced into n frames on export — the photo
 * and route bleed across slide edges. Styling is deck-wide (driven by the
 * chosen theme + the shared accent), not per slide. A slide therefore only
 * carries its id and which template (layout) it uses.
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

/**
 * Decks the user chooses from instead of adding/removing single slides. Each
 * deck is a tight story — Intro → detail(s) → Wrap-up — kept short because
 * engagement drops after slide ~3. The theme supplies how each slide looks.
 */
export type DeckId = "3" | "4";

export const DECKS: Record<DeckId, SlideTemplate[]> = {
  // Intro · Details · Wrap-up
  "3": ["hero", "statGrid", "editorial"],
  // Intro · Details 1 · Details 2 · Wrap-up
  "4": ["hero", "statRow", "statGrid", "editorial"],
};

export const DECK_META: Record<DeckId, { label: string; sub: string }> = {
  "3": { label: "3 slides", sub: "intro · details · wrap-up" },
  "4": { label: "4 slides", sub: "intro · 2 details · wrap-up" },
};

export const DECK_ORDER: DeckId[] = ["3", "4"];
export const DEFAULT_DECK: DeckId = "4";

/** Build a deck's slides with deterministic ids (stable across renders). */
export function buildDeck(deck: DeckId): Slide[] {
  return DECKS[deck].map((template, i) => ({
    id: `slide-${deck}-${i}`,
    template,
  }));
}
