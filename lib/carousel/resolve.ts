/**
 * Resolve the deck-wide visual style: the theme's look + the user's resolved
 * colour scheme (a preset, or photo-derived — already resolved upstream by
 * `resolveColors`). One style drives the whole carousel — there are no
 * per-slide overrides.
 */

import type { ColorScheme } from "@/lib/colors";
import { type CarouselLook, FONT_PAIRS, type FontPair } from "./theme-tokens";

/**
 * The look, with the colour-bearing fields resolved (user choice over the
 * look's own accents) and the font pair expanded. A theme's optional
 * `resolveStyle` may post-process the whole object (STRATA's mood swaps
 * background/ink/accents/dark per config).
 */
export interface EffectiveStyle
  extends Omit<
    CarouselLook,
    "defaultColorChoice" | "defaultFilter" | "defaultGrain" | "fontPair"
  > {
  fonts: FontPair;
  /** the theme's display name (Frame's nameplate / signature fallback) */
  label: string;
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

/** The ink a spanning canvas draws with: white over a photo on a dark theme
 *  (the filtered image swallows the theme ink), the theme ink otherwise. The
 *  same rule `slideText` applies to panel text. */
export function heroInk(style: EffectiveStyle, overPhoto: boolean): string {
  return overPhoto && style.dark ? "#ffffff" : style.ink;
}

/**
 * @param look    the theme's look — supplies fonts, flags, fixed colours
 * @param label   the theme's display name (rides along for the type-led panels)
 * @param colors  the resolved colour scheme (user choice or theme default)
 */
export function resolveDeckStyle(
  look: CarouselLook,
  label: string,
  colors: ColorScheme
): EffectiveStyle {
  const accent = colors.primary;
  const onAccent = colors.onPrimary ?? readableOn(accent);

  return {
    ...look,
    label,
    fonts: FONT_PAIRS[look.fontPair],
    accent,
    accent2: colors.secondary ?? look.accent2,
    onAccent,
    // Some themes tie the elevation viz to the (user-chosen) accent rather than
    // the fixed look colours.
    elevation: look.elevationAccent
      ? { line: accent, fillFrom: accent, fillTo: look.background }
      : look.elevation,
  };
}
