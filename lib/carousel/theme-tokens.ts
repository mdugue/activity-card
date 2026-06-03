/**
 * Per-theme carousel design tokens. Each theme is a distinct, hand-tuned look —
 * not just a colour/type swap. Three levers make them genuinely different:
 *
 *   heroLayer  — the signature element spanning the seamless strip:
 *                route (Trace) · elevation (Ascent) · photo (Exposure) ·
 *                segments (Relay) · none (Frame / Telemetry / Press)
 *   crossViz   — a small secondary glyph on the wrap-up slide
 *   panelKind  — how each slide is laid out:
 *                standard · frame (one huge datum) · telemetry (dense grid) ·
 *                press (editorial pull-quotes)
 *
 * Carousel theme names intentionally differ from the Single Card themes — the
 * carousel is its own medium. The ThemeId still keys both.
 */

import type { ThemeId } from "@/components/themes";
import type { FontPairId, OverlayStyle, RouteStyle } from "./types";

export interface FontPair {
  /** title / editorial display face */
  display: string;
  /** monospace for labels, units, micro-graphic */
  mono: string;
  /** condensed face for big stat numerals */
  numeral: string;
}

export const FONT_PAIRS: Record<FontPairId, FontPair> = {
  condensed: {
    display: "var(--font-heading), sans-serif",
    numeral: "var(--font-heading), sans-serif",
    mono: "var(--font-ibm-plex-mono), monospace",
  },
  editorial: {
    display: "var(--font-cormorant), serif",
    numeral: "var(--font-archivo-narrow), sans-serif",
    mono: "var(--font-ibm-plex-mono), monospace",
  },
  magazine: {
    display: "var(--font-playfair), serif",
    numeral: "var(--font-archivo-narrow), sans-serif",
    mono: "var(--font-ibm-plex-mono), monospace",
  },
  grotesk: {
    display: "var(--font-space-grotesk), sans-serif",
    numeral: "var(--font-space-grotesk), sans-serif",
    mono: "var(--font-geist-mono), monospace",
  },
};

export interface ElevationColors {
  fillFrom: string;
  fillTo: string;
  line: string;
}

export type HeroLayer = "elevation" | "none" | "photo" | "route" | "segments";
export type PanelKind = "frame" | "press" | "standard" | "telemetry";
export type CrossViz = "elevation" | "route";

export interface CarouselThemeTokens {
  accent: string;
  accent2: string;
  background: string;
  /** small secondary glyph on the wrap-up slide */
  crossViz?: CrossViz;
  /** true → slide background is dark, default text is light */
  dark: boolean;
  elevation: ElevationColors;
  fontPair: FontPairId;
  heroLayer: HeroLayer;
  ink: string;
  /** carousel-facing name (distinct from the Single Card theme name) */
  label: string;
  microGraphic: boolean;
  mutedInk: string;
  onAccent: string;
  overlay: OverlayStyle;
  panelKind: PanelKind;
  routeStyle: RouteStyle;
  tagline: string;
}

export const CAROUSEL_THEME_TOKENS: Record<ThemeId, CarouselThemeTokens> = {
  // Trace — route silhouette hero on warm paper, art-print energy.
  path: {
    label: "TRACE",
    tagline: "route as art-print",
    dark: false,
    background: "#f1ebdf",
    ink: "#1a1714",
    mutedInk: "rgba(26,23,20,0.58)",
    accent: "#c45a2c",
    accent2: "#a98352",
    onAccent: "#ffffff",
    fontPair: "editorial",
    overlay: "scrim",
    routeStyle: "poster",
    elevation: { line: "#c45a2c", fillFrom: "#c45a2c", fillTo: "#f1ebdf" },
    heroLayer: "route",
    crossViz: "elevation",
    panelKind: "standard",
    microGraphic: false,
  },
  // Ascent — elevation mountain-range hero, dark alpine.
  altitude: {
    label: "ASCENT",
    tagline: "the mountain range",
    dark: true,
    background: "#0c1116",
    ink: "#f4f1ea",
    mutedInk: "rgba(244,241,234,0.6)",
    accent: "#ff7a3c",
    accent2: "#5bc0d4",
    onAccent: "#0c1116",
    fontPair: "condensed",
    overlay: "scrim",
    routeStyle: "poster",
    elevation: { line: "#ff7a3c", fillFrom: "#ff7a3c", fillTo: "#0c1116" },
    heroLayer: "elevation",
    crossViz: "route",
    panelKind: "standard",
    microGraphic: true,
  },
  // Exposure — full-bleed photo panorama, magazine masthead, thin route.
  photo: {
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
    overlay: "scrim",
    routeStyle: "desaturated",
    elevation: { line: "#ffffff", fillFrom: "#ffffff", fillTo: "transparent" },
    heroLayer: "photo",
    crossViz: "route",
    panelKind: "standard",
    microGraphic: false,
  },
  // Frame — ultra-minimal, one huge datum per slide, hairline rules.
  minimal: {
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
    overlay: "scrim",
    routeStyle: "poster",
    elevation: { line: "#14110e", fillFrom: "#14110e", fillTo: "#f7f5f1" },
    heroLayer: "none",
    panelKind: "frame",
    microGraphic: false,
  },
  // Telemetry — dense instrument panel, metric grid + zone bars + mono.
  data: {
    label: "TELEMETRY",
    tagline: "the instrument panel",
    dark: true,
    background: "#07090c",
    ink: "#d8e2ea",
    mutedInk: "rgba(216,226,234,0.55)",
    accent: "#3ddc97",
    accent2: "#ff7a3c",
    onAccent: "#06080a",
    fontPair: "condensed",
    overlay: "tint",
    routeStyle: "highlighter",
    elevation: { line: "#3ddc97", fillFrom: "#3ddc97", fillTo: "#07090c" },
    heroLayer: "none",
    panelKind: "telemetry",
    microGraphic: true,
  },
  // Press — editorial newspaper, serif pull-quotes, columns, no photo-forward.
  editorial: {
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
    overlay: "strip",
    routeStyle: "poster",
    elevation: { line: "#b1281a", fillFrom: "#b1281a", fillTo: "#f2ece1" },
    heroLayer: "none",
    panelKind: "press",
    microGraphic: false,
  },
  // Relay — triathlon, swim→T1→bike→T2→run segment timeline spanning the strip.
  triathlon: {
    label: "RELAY",
    tagline: "leg by leg",
    dark: true,
    background: "#0b1220",
    ink: "#eef3f8",
    mutedInk: "rgba(238,243,248,0.6)",
    accent: "#34c3eb",
    accent2: "#ffb43c",
    onAccent: "#06080a",
    fontPair: "condensed",
    overlay: "tint",
    routeStyle: "poster",
    elevation: { line: "#34c3eb", fillFrom: "#34c3eb", fillTo: "#0b1220" },
    heroLayer: "segments",
    panelKind: "standard",
    microGraphic: true,
  },
};

/** Carousel-facing label + tagline for the theme picker. */
export const CAROUSEL_THEME_LABELS: Record<
  ThemeId,
  { label: string; tagline: string }
> = Object.fromEntries(
  (Object.keys(CAROUSEL_THEME_TOKENS) as ThemeId[]).map((id) => [
    id,
    {
      label: CAROUSEL_THEME_TOKENS[id].label,
      tagline: CAROUSEL_THEME_TOKENS[id].tagline,
    },
  ])
) as Record<ThemeId, { label: string; tagline: string }>;
