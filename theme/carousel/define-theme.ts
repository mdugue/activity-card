// The carousel theme contract — the carousel family's `defineTheme`. A carousel
// theme is a `ThemeBase` (identity, colour/photo policy, params, capabilities)
// plus its render strategy: a `canvas` spanning component (the signature drawn
// once across the whole n×1080 strip, optional), a `panels[]` array (one
// foreground component per slide — any count), and the `look` they render with.
// The shared `CarouselDeck` composes them; there is no per-theme branch in the
// renderer.
//
// BOTH halves of the render contract live here: `CanvasProps` (the spanning
// signature) and `PanelProps` (one slide's foreground). Each narrows `data` to
// the theme's declared capabilities via `ThemeData<K>` — exactly like the
// single card's `ThemeProps` — so a canvas/panel physically can't read a field
// the theme didn't declare in `uses`. The narrow generic is checked at the
// `defineCarouselTheme` definition site and erased at the registry boundary
// (`CarouselTheme`), the same pattern as `defineTheme`.

import type { FC } from "react";
import {
  CAROUSEL_MARK_DEFAULTS,
  CAROUSEL_MARK_PARAMS,
} from "@/theme/carousel/marks";
import type { EffectiveStyle } from "@/theme/carousel/resolve";
import type { StatOpts } from "@/theme/carousel/stats";
import {
  CAROUSEL_CAPABILITIES,
  type CarouselLook,
} from "@/theme/carousel/theme-tokens";
import type { ParamDef } from "@/theme/core/params/kinds";
import type {
  CapabilityKey,
  ThemeBase,
  ThemeData,
} from "@/theme/core/theme-contract";

/** Props the spanning canvas receives. The canvas reads the STRIP frame — `w`/`h`
 *  are the WHOLE strip (count slides across, one tall) and it bleeds across slide
 *  edges. `data` is capability-narrowed (`ThemeData<K>`; see the file header). */
export interface CanvasProps<K extends CapabilityKey = CapabilityKey> {
  /** the theme's coerced config (e.g. STRATA mood / density / legend) */
  config: Record<string, unknown>;
  data: ThemeData<K>;
  /** strip height = one slide's height (1350 at feed) */
  h: number;
  /** true when a photo backs the deck → firmer halos / outlines */
  overPhoto: boolean;
  style: EffectiveStyle;
  /** strip width = slideCount × slide width (n×1080 at feed) */
  w: number;
}

/** Props every slide panel receives — one foreground per slide. Unlike the
 *  canvas, a panel reads its own SLIDE frame (the deck wraps each slot in a
 *  per-slide `FormatProvider`), so `SafeArea`/`SlideScaffold` floor content to
 *  that slide's safe area. `data` is capability-narrowed. */
export interface PanelProps<K extends CapabilityKey = CapabilityKey> {
  data: ThemeData<K>;
  /** true when a photo backs the slide → text leans on shadows / treatment */
  hasPhoto: boolean;
  index: number;
  /** print the "made with effort" mark (wrap-up slide only) */
  showEffort: boolean;
  /** print the "01 / 04" slide index */
  showPageNumber: boolean;
  /** distance/time stat toggles — the only element-visibility a panel needs;
   *  every other toggle is already applied by stripping `data` upstream */
  statOpts: StatOpts;
  style: EffectiveStyle;
  total: number;
}

export type CanvasComponent<K extends CapabilityKey = CapabilityKey> = FC<
  CanvasProps<K>
>;
export type PanelComponent<K extends CapabilityKey = CapabilityKey> = FC<
  PanelProps<K>
>;

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
 * and components, plus params/`resolveStyle` only when it has knobs. `uses` also
 * narrows the canvas/panel `data` type (see the file header).
 */
export function defineCarouselTheme<
  const Caps extends readonly CapabilityKey[] = readonly CapabilityKey[],
>(d: {
  canvas?: CanvasComponent<Caps[number]>;
  defaults?: Record<string, unknown>;
  id: string;
  label: string;
  look: CarouselLook;
  panels: PanelComponent<Caps[number]>[];
  params?: ParamDef[];
  resolveStyle?: ResolveStyle;
  tagline: string;
  uses?: Caps;
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
    // The two universal carousel marks (effort / page numbers) are appended to
    // every theme as MARKS params, so the editor renders them generically and
    // they persist in the per-theme config — no carousel-only flags in the
    // shared `Visibility`. Theme-specific marks (STRATA's legend) follow them.
    params: [...CAROUSEL_MARK_PARAMS, ...(d.params ?? [])],
    defaults: { ...CAROUSEL_MARK_DEFAULTS, ...(d.defaults ?? {}) },
    look,
    // reason: the registry stores every carousel theme under one widened
    // signature; the narrow `Caps` generic is fully checked above, at the
    // definition site (mirrors `defineTheme`'s `Component as FC<ThemeProps>`).
    canvas: d.canvas as CanvasComponent | undefined,
    panels: d.panels as PanelComponent[],
    resolveStyle: d.resolveStyle,
  };
}
