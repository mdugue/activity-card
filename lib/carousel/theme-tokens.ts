/**
 * Per-theme carousel design tokens. Each theme is a distinct, hand-tuned look —
 * not just a colour/type swap. The signature levers:
 *
 *   heroLayer  — the element spanning the seamless strip:
 *                route (Trace) · elevation (Ascent) · photo (Exposure) ·
 *                none (Frame / Press)
 *   crossViz   — a small secondary glyph on the wrap-up slide
 *   panelKind  — how each slide is laid out:
 *                standard · frame (one big datum + sparkline) · press (broadsheet)
 *   heroMetric — which number headlines the intro slide (distance vs elevation)
 *   detailViz  — render small path + altitude graphics on the detail slide(s)
 *                (themes whose hero isn't already the route/elevation)
 *
 * Carousel themes have their OWN id space (`CarouselThemeId`), independent of the
 * Single Card `ThemeId`, so the carousel can grow its own families (e.g. the
 * Dawn/Dusk light·dark pairs) without being capped at the single-card count.
 */

import type { ColorChoice } from "@/lib/colors";
import type { ParamDef } from "@/lib/params/kinds";
import { DEFAULT_STRATA_CONFIG, STRATA_PARAMS } from "@/lib/strata";
import type { CapabilityKey } from "@/lib/theme-contract";
import type { FontPairId, RouteStyle } from "./types";

/** Carousel theme identifiers. Add new families here freely — nothing ties this
 *  to the single-card theme count. */
export type CarouselThemeId =
  | "traceDawn"
  | "traceDusk"
  | "ascentDawn"
  | "ascentDusk"
  | "exposure"
  | "frame"
  | "press"
  | "strata";

export const DEFAULT_CAROUSEL_THEME: CarouselThemeId = "traceDawn";

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

export type HeroLayer = "elevation" | "none" | "photo" | "route" | "strata";
export type HeroMetric = "distance" | "elevation";
export type PanelKind = "frame" | "press" | "standard";
export type CrossViz = "elevation" | "route";

export interface CarouselThemeTokens {
  accent: string;
  accent2: string;
  background: string;
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
  /** per-theme adjustable knobs (STRATA's mood/density/legend) */
  defaults?: Record<string, unknown>;
  /** render small path + altitude graphics on the detail slide(s) — for themes
   *  whose hero layer isn't already the route or the elevation range */
  detailViz: boolean;
  elevation: ElevationColors;
  /** elevation viz follows the shared accent instead of the fixed token colours */
  elevationAccent?: boolean;
  fontPair: FontPairId;
  heroLayer: HeroLayer;
  /** which stat headlines the intro slide */
  heroMetric: HeroMetric;
  ink: string;
  /** carousel-facing name */
  label: string;
  mutedInk: string;
  onAccent: string;
  panelKind: PanelKind;
  params?: ParamDef[];
  routeStyle: RouteStyle;
  tagline: string;
}

export const CAROUSEL_THEME_TOKENS: Record<
  CarouselThemeId,
  CarouselThemeTokens
> = {
  // Trace Dawn — route silhouette as an art-print on warm paper, serif.
  traceDawn: {
    label: "TRACE DAWN",
    tagline: "route, on paper",
    dark: false,
    background: "#f1ebdf",
    ink: "#211c17",
    mutedInk: "rgba(33,28,23,0.55)",
    accent: "#c45a2c",
    accent2: "#a98352",
    onAccent: "#ffffff",
    fontPair: "serif",
    routeStyle: "poster",
    elevation: { line: "#c45a2c", fillFrom: "#c45a2c", fillTo: "#f1ebdf" },
    heroLayer: "route",
    heroMetric: "distance",
    crossViz: "elevation",
    panelKind: "standard",
    detailViz: false,
    defaultFilter: "fade",
    defaultGrain: true,
  },
  // Trace Dusk — the same route, after dark; condensed bold over warm black.
  traceDusk: {
    label: "TRACE DUSK",
    tagline: "route, after dark",
    dark: true,
    background: "#16120e",
    ink: "#f3ede2",
    mutedInk: "rgba(243,237,226,0.6)",
    accent: "#e0683a",
    accent2: "#caa46a",
    onAccent: "#16120e",
    fontPair: "bold",
    routeStyle: "poster",
    elevation: { line: "#e0683a", fillFrom: "#e0683a", fillTo: "#16120e" },
    heroLayer: "route",
    heroMetric: "distance",
    crossViz: "elevation",
    panelKind: "standard",
    detailViz: false,
    defaultFilter: "noir",
    defaultGrain: false,
  },
  // Ascent Dawn — elevation mountain-range at first light, serif on alpine haze.
  ascentDawn: {
    label: "ASCENT DAWN",
    tagline: "the range at first light",
    dark: false,
    background: "#eaedef",
    ink: "#1a2026",
    mutedInk: "rgba(26,32,38,0.55)",
    accent: "#2f6f86",
    accent2: "#c4663a",
    onAccent: "#ffffff",
    fontPair: "serif",
    routeStyle: "poster",
    elevation: { line: "#2f6f86", fillFrom: "#2f6f86", fillTo: "#eaedef" },
    elevationAccent: true,
    heroLayer: "elevation",
    heroMetric: "elevation",
    crossViz: "route",
    panelKind: "standard",
    detailViz: false,
    defaultFilter: "fade",
    defaultGrain: true,
  },
  // Ascent Dusk — the alpine range after dark; condensed bold (was Altitude).
  ascentDusk: {
    label: "ASCENT DUSK",
    tagline: "the range after dark",
    dark: true,
    background: "#0c1116",
    ink: "#f4f1ea",
    mutedInk: "rgba(244,241,234,0.6)",
    accent: "#ff7a3c",
    accent2: "#5bc0d4",
    onAccent: "#0c1116",
    fontPair: "bold",
    routeStyle: "poster",
    elevation: { line: "#ff7a3c", fillFrom: "#ff7a3c", fillTo: "#0c1116" },
    elevationAccent: true,
    heroLayer: "elevation",
    heroMetric: "elevation",
    crossViz: "route",
    panelKind: "standard",
    detailViz: false,
    defaultFilter: "noir",
    defaultGrain: false,
  },
  // Exposure — full-bleed photo panorama, magazine masthead. The route +
  // elevation appear as small graphics on the detail slide (the photo is hero).
  exposure: {
    label: "EXPOSURE",
    tagline: "photo, full-bleed",
    dark: true,
    background: "#121212",
    ink: "#ffffff",
    mutedInk: "rgba(255,255,255,0.78)",
    accent: "#e8c39e",
    accent2: "#c89d6e",
    onAccent: "#0a0a0a",
    fontPair: "magazine",
    routeStyle: "desaturated",
    elevation: { line: "#ffffff", fillFrom: "#ffffff", fillTo: "transparent" },
    heroLayer: "photo",
    heroMetric: "distance",
    crossViz: "route",
    panelKind: "standard",
    detailViz: true,
    defaultColorChoice: { kind: "photo", variant: "vibrant" },
    defaultFilter: "none",
    defaultGrain: false,
  },
  // Frame — ultra-minimal, one big datum + sparkline per slide, hairline rules.
  frame: {
    label: "FRAME",
    tagline: "one number at a time",
    dark: false,
    background: "#f7f5f1",
    ink: "#14110e",
    mutedInk: "rgba(20,17,14,0.5)",
    accent: "#1a1714",
    accent2: "#c0341d",
    onAccent: "#ffffff",
    fontPair: "grotesk",
    routeStyle: "poster",
    elevation: { line: "#14110e", fillFrom: "#14110e", fillTo: "#f7f5f1" },
    heroLayer: "none",
    heroMetric: "distance",
    panelKind: "frame",
    detailViz: false,
    defaultFilter: "fade",
    defaultGrain: false,
  },
  // Press — editorial newspaper, serif headline, opaque print boxes over photo.
  // Small print-style path/altitude cuts ride along the spreads.
  press: {
    label: "PRESS",
    tagline: "the broadsheet",
    dark: false,
    background: "#f2ece1",
    ink: "#14110d",
    mutedInk: "rgba(20,17,13,0.58)",
    accent: "#b1281a",
    accent2: "#1d3a2e",
    onAccent: "#ffffff",
    fontPair: "magazine",
    routeStyle: "poster",
    elevation: { line: "#14110d", fillFrom: "#14110d", fillTo: "#f2ece1" },
    heroLayer: "none",
    heroMetric: "distance",
    panelKind: "press",
    detailViz: true,
    defaultFilter: "mono",
    defaultGrain: true,
  },
  // Strata — the generative woven morph-field is the spanning hero: the route
  // ridge runs along the top, the elevation ridge along the bottom, the
  // abstraction fills the middle, and the swipe walks across the whole
  // topography. No photo — the activity itself is the artwork. Dusk palette,
  // Syne display.
  strata: {
    label: "STRATA",
    tagline: "woven topography",
    dark: true,
    background:
      "linear-gradient(180deg, #241335 0%, #5e2450 32%, #b1402c 64%, #ec8a3c 100%)",
    ink: "#f8ead7",
    mutedInk: "rgba(248,234,215,0.62)",
    accent: "#ffd98a",
    accent2: "#ff6a3a",
    onAccent: "#241335",
    fontPair: "syne",
    routeStyle: "poster",
    elevation: { line: "#ff6a3a", fillFrom: "#ff6a3a", fillTo: "#241335" },
    heroLayer: "strata",
    heroMetric: "distance",
    panelKind: "standard",
    detailViz: false,
    params: STRATA_PARAMS,
    defaults: DEFAULT_STRATA_CONFIG,
    // A background photo is optional: the woven field rides over it, the same
    // way the single card composes the field on a photo.
    defaultFilter: "none",
    defaultGrain: false,
  },
};

/** Picker order — Dawn/Dusk pairs first, then the type-led themes. */
export const CAROUSEL_THEME_ORDER: CarouselThemeId[] = [
  "traceDawn",
  "traceDusk",
  "ascentDawn",
  "ascentDusk",
  "exposure",
  "frame",
  "press",
  "strata",
];

/**
 * Every carousel theme renders the same overlay set: the sport-aware stat
 * palette (`buildStats`) plus the route + elevation viz (every theme draws both
 * — as the spanning hero, a cross-viz, a detail cut, or a sparkline). Splits are
 * never shown as a list, so the only capability omitted is `splits`. Data
 * presence (`availableVisibility`) handles sport-appropriateness (pace, speed),
 * so no `usesWhen` is needed. Drives the editor toggles via `themeAvailability`.
 *
 * The theme descriptors themselves (component layer: identity + colour/photo
 * policy + canvas + panels) live in `components/themes/carousel/registry.ts`,
 * built from these look tokens — this file stays the pure look-token source.
 */
export const CAROUSEL_CAPABILITIES: readonly CapabilityKey[] = [
  "athleteName",
  "cadence",
  "elevation",
  "elevationViz",
  "heartRate",
  "location",
  "pace",
  "power",
  "route",
  "speed",
];
