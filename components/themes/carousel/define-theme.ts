// The carousel theme contract — the carousel family's `defineTheme`. A carousel
// theme is a `ThemeBase` (identity, colour/photo policy, params, capabilities)
// plus its render strategy: a `canvas` spanning component (the signature drawn
// once across the whole n×1080 strip, optional) and a `panels[]` array (one
// foreground component per slide — any count). The shared `CarouselDeck`
// composes them; there is no per-theme branch in the renderer.

import type { FC } from "react";
import type { ActivityData } from "@/lib/activity";
import type { EffectiveStyle } from "@/lib/carousel/resolve";
import type { CarouselThemeTokens } from "@/lib/carousel/theme-tokens";
import type { CapabilityKey, ThemeBase } from "@/lib/theme-contract";
import type { PanelProps } from "./templates/shared";

/** Props the spanning canvas component receives — sized to the whole strip. */
export interface CanvasProps {
  /** the theme's coerced config (e.g. STRATA mood / density / legend) */
  config: Record<string, unknown>;
  data: ActivityData;
  /** strip height (1350) */
  h: number;
  /** true when a photo backs the deck → firmer halos / outlines */
  overPhoto: boolean;
  style: EffectiveStyle;
  /** strip width (slideCount × 1080) */
  w: number;
}

export type CanvasComponent = FC<CanvasProps>;
export type PanelComponent = FC<PanelProps>;

/** A post-processor for the deck style, driven by the theme's config (STRATA's
 *  mood swaps the whole palette). Default is identity. */
export type ResolveStyle = (
  base: EffectiveStyle,
  config: Record<string, unknown>
) => EffectiveStyle;

export interface CarouselTheme extends ThemeBase {
  /** spanning signature drawn once across the strip; omitted for photo-only
   *  themes (Exposure / Frame / Press) */
  canvas?: CanvasComponent;
  /** the surviving style tokens the canvas + panels consume */
  look: CarouselThemeTokens;
  /** one foreground component per slide; its length is the slide count */
  panels: PanelComponent[];
  resolveStyle?: ResolveStyle;
}

/**
 * Declare a carousel theme. Colour + photo policy and the adjustable knobs
 * (`params` / `defaults`) all derive from the `look` tokens (every carousel
 * theme is colour-adjustable; the tokens are the Reset target), so a theme only
 * states its components + capabilities (+ an optional `resolveStyle`).
 */
export function defineCarouselTheme(d: {
  canvas?: CanvasComponent;
  id: string;
  label: string;
  look: CarouselThemeTokens;
  panels: PanelComponent[];
  resolveStyle?: ResolveStyle;
  tagline: string;
  uses: readonly CapabilityKey[];
}): CarouselTheme {
  const { look } = d;
  return {
    id: d.id,
    label: d.label,
    tagline: d.tagline,
    uses: d.uses,
    colors: {
      default: {
        primary: look.accent,
        secondary: look.accent2,
        onPrimary: look.onAccent,
      },
      defaultChoice: look.defaultColorChoice,
      userAdjustable: true,
    },
    photo: {
      defaultOn: true,
      defaultFilter: look.defaultFilter,
      defaultGrain: look.defaultGrain,
    },
    params: look.params ?? [],
    defaults: look.defaults ?? {},
    look,
    canvas: d.canvas,
    panels: d.panels,
    resolveStyle: d.resolveStyle,
  };
}
