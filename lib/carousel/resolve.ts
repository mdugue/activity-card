/**
 * Resolve the deck-wide visual style: theme defaults + the user's resolved
 * colour scheme (a preset, or photo-derived — already resolved upstream by
 * `resolveColors`). One style drives the whole carousel — there are no
 * per-slide overrides.
 */

import type { ColorScheme } from "@/lib/colors";
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
  detailViz: boolean;
  elevation: ElevationColors;
  fonts: FontPair;
  heroLayer: HeroLayer;
  heroMetric: HeroMetric;
  ink: string;
  label: string;
  mutedInk: string;
  onAccent: string;
  panelKind: PanelKind;
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
 * @param theme   chosen carousel theme — supplies fonts, overlay, colours
 * @param colors  the resolved colour scheme (user choice or theme default)
 */
export function resolveDeckStyle(
  theme: CarouselThemeId,
  colors: ColorScheme
): EffectiveStyle {
  const tokens = CAROUSEL_THEME_TOKENS[theme];

  const resolvedAccent = colors.primary;
  const accent2 = colors.secondary ?? tokens.accent2;
  const onAccent = colors.onPrimary ?? readableOn(resolvedAccent);

  return {
    accent: resolvedAccent,
    accent2,
    onAccent,
    background: tokens.background,
    ink: tokens.ink,
    mutedInk: tokens.mutedInk,
    dark: tokens.dark,
    detailViz: tokens.detailViz,
    fonts: FONT_PAIRS[tokens.fontPair],
    routeStyle: tokens.routeStyle,
    heroLayer: tokens.heroLayer,
    heroMetric: tokens.heroMetric,
    crossViz: tokens.crossViz,
    panelKind: tokens.panelKind,
    label: tokens.label,
    // Some themes tie the elevation viz to the (user-chosen) accent rather than
    // the fixed token colours.
    elevation: tokens.elevationAccent
      ? {
          line: resolvedAccent,
          fillFrom: resolvedAccent,
          fillTo: tokens.background,
        }
      : tokens.elevation,
  };
}
