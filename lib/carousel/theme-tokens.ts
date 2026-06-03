/**
 * Per-theme carousel design tokens. Each theme is a distinct, hand-tuned look —
 * not just a colour/type swap. The signature levers:
 *
 *   heroLayer  — the element spanning the seamless strip:
 *                route (Trace) · elevation (Ascent) · photo (Exposure) ·
 *                segments (Relay) · none (Frame / Press)
 *   crossViz   — a small secondary glyph on the wrap-up slide
 *   panelKind  — how each slide is laid out:
 *                standard · frame (one big datum + sparkline) · press (broadsheet)
 *   heroMetric — which number headlines the intro slide (distance vs elevation)
 *
 * Carousel themes have their OWN id space (`CarouselThemeId`), independent of the
 * Single Card `ThemeId`, so the carousel can grow its own families (e.g. the
 * Dawn/Dusk light·dark pairs) without being capped at the single-card count.
 */

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
  | "relay";

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
  // Dark & bold — the Dusk pairs + Relay. Anton slab of condensed weight.
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
};

export interface ElevationColors {
  fillFrom: string;
  fillTo: string;
  line: string;
}

export type HeroLayer = "elevation" | "none" | "photo" | "route" | "segments";
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
  /** photo filter preset applied by default when this theme is chosen */
  defaultFilter: string;
  /** film grain on by default for this theme */
  defaultGrain: boolean;
  elevation: ElevationColors;
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
  /** theme can render an uploaded background photo */
  photoSupported: boolean;
  routeStyle: RouteStyle;
  tagline: string;
  /** derive the accent palette from the photo (Exposure only) */
  usesPhotoPalette: boolean;
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
    photoSupported: true,
    usesPhotoPalette: false,
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
    photoSupported: true,
    usesPhotoPalette: false,
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
    heroLayer: "elevation",
    heroMetric: "elevation",
    crossViz: "route",
    panelKind: "standard",
    photoSupported: true,
    usesPhotoPalette: false,
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
    heroLayer: "elevation",
    heroMetric: "elevation",
    crossViz: "route",
    panelKind: "standard",
    photoSupported: true,
    usesPhotoPalette: false,
    defaultFilter: "noir",
    defaultGrain: false,
  },
  // Exposure — full-bleed photo panorama, magazine masthead, thin route.
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
    photoSupported: true,
    usesPhotoPalette: true,
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
    photoSupported: true,
    usesPhotoPalette: false,
    defaultFilter: "fade",
    defaultGrain: false,
  },
  // Press — editorial newspaper, serif headline, opaque print boxes over photo.
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
    elevation: { line: "#b1281a", fillFrom: "#b1281a", fillTo: "#f2ece1" },
    heroLayer: "none",
    heroMetric: "distance",
    panelKind: "press",
    photoSupported: true,
    usesPhotoPalette: false,
    defaultFilter: "mono",
    defaultGrain: true,
  },
  // Relay — triathlon, swim→T1→bike→T2→run timeline spanning the strip.
  relay: {
    label: "RELAY",
    tagline: "leg by leg",
    dark: true,
    background: "#0b1220",
    ink: "#eef3f8",
    mutedInk: "rgba(238,243,248,0.6)",
    accent: "#34c3eb",
    accent2: "#ffb43c",
    onAccent: "#06080a",
    fontPair: "bold",
    routeStyle: "poster",
    elevation: { line: "#34c3eb", fillFrom: "#34c3eb", fillTo: "#0b1220" },
    heroLayer: "segments",
    heroMetric: "distance",
    crossViz: "elevation",
    panelKind: "standard",
    photoSupported: true,
    usesPhotoPalette: false,
    defaultFilter: "noir",
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
  "relay",
];

/** Carousel-facing label + tagline for the theme picker. */
export const CAROUSEL_THEME_LABELS: Record<
  CarouselThemeId,
  { label: string; tagline: string }
> = Object.fromEntries(
  CAROUSEL_THEME_ORDER.map((id) => [
    id,
    {
      label: CAROUSEL_THEME_TOKENS[id].label,
      tagline: CAROUSEL_THEME_TOKENS[id].tagline,
    },
  ])
) as Record<CarouselThemeId, { label: string; tagline: string }>;
