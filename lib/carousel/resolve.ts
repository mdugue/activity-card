/**
 * Resolve the deck-wide visual style: theme defaults + the shared accent
 * (or, for the Photo theme, the photo-adaptive palette). One style drives the
 * whole carousel — there are no per-slide overrides.
 */

import type { ThemeId } from "@/components/themes";
import type { PaletteTheme } from "@/lib/palette";
import {
  CAROUSEL_THEME_TOKENS,
  type CrossViz,
  type ElevationColors,
  FONT_PAIRS,
  type FontPair,
  type HeroLayer,
  type PanelKind,
} from "./theme-tokens";
import type { OverlayStyle, RouteStyle } from "./types";

export interface EffectiveStyle {
  accent: string;
  accent2: string;
  background: string;
  crossViz?: CrossViz;
  dark: boolean;
  elevation: ElevationColors;
  fonts: FontPair;
  heroLayer: HeroLayer;
  ink: string;
  label: string;
  microGraphic: boolean;
  mutedInk: string;
  onAccent: string;
  overlayStyle: OverlayStyle;
  panelKind: PanelKind;
  routeStyle: RouteStyle;
}

/** Parse a #rgb / #rrggbb hex into an rgba() string at the given alpha.
 *  Passes through any non-hex value (e.g. an existing rgba/named colour). */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith("#")) {
    return hex;
  }
  let c = hex.slice(1);
  if (c.length === 3) {
    c = c
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (c.length < 6) {
    return hex;
  }
  const r = Number.parseInt(c.slice(0, 2), 16);
  const g = Number.parseInt(c.slice(2, 4), 16);
  const b = Number.parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
 * @param theme       chosen theme — supplies fonts, overlay, route, colours
 * @param accent      shared accent swatch (single-card control)
 * @param photoTheme  extracted palette; only consulted for the Photo theme,
 *                    so that theme stays bespoke-to-the-photo like single card
 */
export function resolveDeckStyle(
  theme: ThemeId,
  accent: string,
  photoTheme: PaletteTheme | null
): EffectiveStyle {
  const tokens = CAROUSEL_THEME_TOKENS[theme];

  let resolvedAccent = accent;
  let accent2 = accent;
  let onAccent = readableOn(accent);
  if (theme === "photo" && photoTheme) {
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
    overlayStyle: tokens.overlay,
    routeStyle: tokens.routeStyle,
    heroLayer: tokens.heroLayer,
    crossViz: tokens.crossViz,
    panelKind: tokens.panelKind,
    label: tokens.label,
    microGraphic: tokens.microGraphic,
    elevation: tokens.elevation,
  };
}
