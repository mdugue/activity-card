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

/** Props the spanning canvas component receives — sized to the whole strip and
 *  drawn once across every slide. `data` is narrowed to the theme's declared
 *  capabilities (`ThemeData<K>`); the default (`K = CapabilityKey`) resolves to
 *  the full `ActivityData`, so a theme that declares every capability — every
 *  current carousel theme — reads everything. */
export interface CanvasProps<K extends CapabilityKey = CapabilityKey> {
  /** the theme's coerced config (e.g. STRATA mood / density / legend) */
  config: Record<string, unknown>;
  data: ThemeData<K>;
  /** strip height (1350) */
  h: number;
  /** true when a photo backs the deck → firmer halos / outlines */
  overPhoto: boolean;
  style: EffectiveStyle;
  /** strip width (slideCount × 1080) */
  w: number;
}

/** Props every carousel slide panel receives — one foreground per slide. Like
 *  `CanvasProps`, `data` is narrowed to the theme's declared capabilities. Each
 *  panel derives the stats it shows directly from `data` (see
 *  `lib/carousel/stats.ts`) — there is no deck-wide stat planner. */
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
 * and components, plus params/`resolveStyle` only when it has knobs.
 *
 * `uses` also narrows the canvas/panel `data` type (via `ThemeData`), so the
 * declaration is compiler-checked against what those components read — the same
 * guarantee `defineTheme` gives the single card. Omitting `uses` (every current
 * theme) leaves `Caps = CapabilityKey`, i.e. the full `ActivityData`; the day a
 * theme narrows `uses`, reading an undeclared field in its canvas/panel becomes
 * a compile error.
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
