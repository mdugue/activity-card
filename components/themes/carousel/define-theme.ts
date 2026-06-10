// The carousel theme contract — the carousel family's `defineTheme`. A carousel
// theme is a `ThemeBase` (identity, colour/photo policy, params, capabilities)
// plus its render strategy: a `canvas` spanning component (the signature drawn
// once across the whole n×1080 strip, optional), a `panels[]` array (one
// foreground component per slide — any count), and the `look` they render with.
// The shared `CarouselDeck` composes them; there is no per-theme branch in the
// renderer.

import type { FC } from "react";
import type { ActivityData } from "@/lib/activity";
import type { EffectiveStyle } from "@/lib/carousel/resolve";
import {
  CAROUSEL_CAPABILITIES,
  type CarouselLook,
} from "@/lib/carousel/theme-tokens";
import type { ParamDef } from "@/lib/params/kinds";
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
  /** the hand-tuned look the canvas + panels render with */
  look: CarouselLook;
  /** one foreground component per slide; its length is the slide count */
  panels: PanelComponent[];
  resolveStyle?: ResolveStyle;
}

/**
 * Declare a carousel theme. Colour + photo policy derive from the `look`
 * (every carousel theme is colour-adjustable; the look is the Reset target),
 * and `uses` defaults to the shared `CAROUSEL_CAPABILITIES` — every current
 * theme renders the same overlay set — so a theme states its identity, look,
 * and components, plus params/`resolveStyle` only when it has knobs.
 */
export function defineCarouselTheme(d: {
  canvas?: CanvasComponent;
  defaults?: Record<string, unknown>;
  id: string;
  label: string;
  look: CarouselLook;
  panels: PanelComponent[];
  params?: ParamDef[];
  resolveStyle?: ResolveStyle;
  tagline: string;
  uses?: readonly CapabilityKey[];
}): CarouselTheme {
  const { look } = d;
  return {
    id: d.id,
    label: d.label,
    tagline: d.tagline,
    uses: d.uses ?? CAROUSEL_CAPABILITIES,
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
    params: d.params ?? [],
    defaults: d.defaults ?? {},
    look,
    canvas: d.canvas,
    panels: d.panels,
    resolveStyle: d.resolveStyle,
  };
}
