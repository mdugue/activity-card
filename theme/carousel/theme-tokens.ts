/**
 * The carousel look vocabulary — the types (and font pairs) a theme's `look`
 * is written in. The looks themselves live inline on the theme descriptors in
 * `components/themes/carousel/registry.ts` (one `defineCarouselTheme` per
 * theme, the carousel peer of a single-card theme file); this module stays the
 * pure, component-free vocabulary so `lib/` never imports the component layer.
 */

import type { ColorChoice } from "@/theme/core/colors";
import type { CapabilityKey } from "@/theme/core/theme-contract";
import type { FontPairId, RouteStyle } from "./types";

export interface FontPair {
  /** title / editorial display face */
  display: string;
  displayWeight: number;
  /** monospace for labels, units, captions */
  mono: string;
  /** face for big stat numerals */
  numeral: string;
  numeralWeight: number;
}

export const FONT_PAIRS: Record<FontPairId, FontPair> = {
  // Light & serif — the Dawn pairs. Elegant garamond numerals, art-print energy.
  serif: {
    display: "var(--font-cormorant), serif",
    displayWeight: 600,
    numeral: "var(--font-cormorant), serif",
    numeralWeight: 600,
    mono: "var(--font-ibm-plex-mono), monospace",
  },
  // Dark & bold — the Dusk pairs. Anton slab of condensed weight.
  bold: {
    display: "var(--font-heading), sans-serif",
    displayWeight: 400,
    numeral: "var(--font-heading), sans-serif",
    numeralWeight: 400,
    mono: "var(--font-ibm-plex-mono), monospace",
  },
  // Magazine — Playfair display + numerals for Exposure / Press.
  magazine: {
    display: "var(--font-playfair), serif",
    displayWeight: 700,
    numeral: "var(--font-playfair), serif",
    numeralWeight: 600,
    mono: "var(--font-ibm-plex-mono), monospace",
  },
  // Grotesk — Space Grotesk, the Frame system face.
  grotesk: {
    display: "var(--font-space-grotesk), sans-serif",
    displayWeight: 600,
    numeral: "var(--font-space-grotesk), sans-serif",
    numeralWeight: 600,
    mono: "var(--font-geist-mono), monospace",
  },
  // Syne — the STRATA face: geometric display + JetBrains Mono cartography.
  syne: {
    display: "var(--font-syne), sans-serif",
    displayWeight: 800,
    numeral: "var(--font-syne), sans-serif",
    numeralWeight: 700,
    mono: "var(--font-mono), monospace",
  },
};

export interface ElevationColors {
  fillFrom: string;
  fillTo: string;
  line: string;
}

export type HeroMetric = "distance" | "elevation";
export type CrossViz = "elevation" | "route";

/**
 * A carousel theme's hand-tuned look. The signature levers:
 *
 *   heroMetric    — which number headlines the intro slide
 *   crossViz      — a small secondary glyph on the wrap-up slide
 *   detailViz     — small path + altitude graphics on the detail slide(s)
 *                   (themes whose canvas isn't already the route/elevation)
 *   contentAnchor — where slide content sits: "top" above an elevation-range
 *                   canvas, "bottom" everywhere else
 *   veil          — draw the light legibility wash between photo and panels
 *                   (type-led themes protect their own text instead)
 */
export interface CarouselLook {
  accent: string;
  accent2: string;
  background: string;
  /** where a slide's content sits vertically */
  contentAnchor: "bottom" | "top";
  /** small secondary glyph on the wrap-up slide */
  crossViz?: CrossViz;
  /** true → slide background is dark, default text is light */
  dark: boolean;
  /** initial colour choice when the user hasn't picked one — Exposure
   *  defaults to the photo-derived palette */
  defaultColorChoice?: ColorChoice;
  /** photo filter preset applied by default when this theme is chosen */
  defaultFilter: string;
  /** film grain on by default for this theme */
  defaultGrain: boolean;
  /** render small path + altitude graphics on the detail slide(s) */
  detailViz: boolean;
  elevation: ElevationColors;
  /** elevation viz follows the shared accent instead of the fixed colours */
  elevationAccent?: boolean;
  fontPair: FontPairId;
  /** which stat headlines the intro slide */
  heroMetric: HeroMetric;
  ink: string;
  mutedInk: string;
  onAccent: string;
  routeStyle: RouteStyle;
  /** light wash between photo and panels so text reads over imagery */
  veil: boolean;
}

/**
 * Every carousel theme renders the same overlay set: the sport-aware stat
 * palette (`buildStats`) plus the route + elevation viz (every theme draws both
 * — as the spanning canvas, a cross-viz, a detail cut, or a sparkline). Splits
 * are never shown as a list, but they feed Frame's coarse speed sparkline
 * (`speedSeries` falls back to per-split speeds), so the capability is
 * declared — toggling Splits off legitimately drops that sparkline. Data
 * presence (`availableVisibility`) handles sport-appropriateness (pace, speed),
 * so no `usesWhen` is needed. Drives the editor toggles via `themeControls`;
 * `defineCarouselTheme` uses this as the default `uses`. Every carousel theme
 * also renders the title, date, distance, time, and a background photo.
 */
export const CAROUSEL_CAPABILITIES: readonly CapabilityKey[] = [
  "athleteName",
  "cadence",
  "date",
  "distance",
  "elevation",
  "elevationViz",
  "heartRate",
  "location",
  "pace",
  "photo",
  "power",
  "route",
  "speed",
  "splits",
  "time",
  "title",
];
