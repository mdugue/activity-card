/**
 * Resolve the deck-wide visual style: theme defaults + the shared accent
 * (or, for the Photo theme, the photo-adaptive palette). One style drives the
 * whole carousel — there are no per-slide overrides.
 */

import type { PaletteTheme } from "@/lib/palette";
import {
  CAROUSEL_THEME_TOKENS,
  type CarouselThemeId,
  type CrossViz,
  type ElevationColors,
  FONT_PAIRS,
  type FontPair,
  type HeroLayer,
  type HeroMetric,
  type PanelKind,
} from "./theme-tokens";
import type { RouteStyle } from "./types";

export interface EffectiveStyle {
  accent: string;
  accent2: string;
  background: string;
  crossViz?: CrossViz;
  dark: boolean;
  elevation: ElevationColors;
  fonts: FontPair;
  heroLayer: HeroLayer;
  heroMetric: HeroMetric;
  ink: string;
  label: string;
  mutedInk: string;
  onAccent: string;
  panelKind: PanelKind;
  photoSupported: boolean;
  routeStyle: RouteStyle;
}

/** Black or white, whichever reads better on a solid hex fill. */
export function readableOn(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) {
    return "#0a0a0a";
  }
  const r = Number.parseInt(c.slice(0, 2), 16);
  const g = Number.parseInt(c.slice(2, 4), 16);
  const b = Number.parseInt(c.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? "#0a0a0a" : "#ffffff";
}

/**
 * @param theme       chosen carousel theme — supplies fonts, overlay, colours
 * @param accent      shared accent swatch (single-card control)
 * @param photoTheme  extracted palette; only consulted for photo-palette themes
 *                    (Exposure), so that theme stays bespoke-to-the-photo
 */
export function resolveDeckStyle(
  theme: CarouselThemeId,
  accent: string,
  photoTheme: PaletteTheme | null
): EffectiveStyle {
  const tokens = CAROUSEL_THEME_TOKENS[theme];

  let resolvedAccent = accent;
  let accent2 = tokens.accent2;
  let onAccent = readableOn(accent);
  if (tokens.usesPhotoPalette && photoTheme) {
    resolvedAccent = photoTheme.accent;
    accent2 = photoTheme.accent2;
    onAccent = photoTheme.onAccent;
  }

  return {
    accent: resolvedAccent,
    accent2,
    onAccent,
    background: tokens.background,
    ink: tokens.ink,
    mutedInk: tokens.mutedInk,
    dark: tokens.dark,
    fonts: FONT_PAIRS[tokens.fontPair],
    routeStyle: tokens.routeStyle,
    heroLayer: tokens.heroLayer,
    heroMetric: tokens.heroMetric,
    crossViz: tokens.crossViz,
    panelKind: tokens.panelKind,
    photoSupported: tokens.photoSupported,
    label: tokens.label,
    elevation: tokens.elevation,
  };
}
