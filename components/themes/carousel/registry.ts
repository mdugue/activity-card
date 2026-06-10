// The carousel theme registry: one `CarouselTheme` descriptor per id, built
// from the look tokens (`lib/carousel/theme-tokens.ts`) plus this layer's
// components — the spanning `canvas` and the per-slide `panels`. This is the
// carousel peer of `SINGLE_CARD_THEMES`; `CarouselDeck` renders any descriptor
// generically. Most themes share the standard `[Hero, StatGrid, Editorial]`
// panels and differ only by canvas + look; Frame and Press bring their own.

import type { EffectiveStyle } from "@/lib/carousel/resolve";
import { readableOn } from "@/lib/carousel/resolve";
import {
  CAROUSEL_CAPABILITIES,
  CAROUSEL_THEME_ORDER,
  CAROUSEL_THEME_TOKENS,
  type CarouselThemeId,
} from "@/lib/carousel/theme-tokens";
import {
  DEFAULT_STRATA_CONFIG,
  STRATA_MOODS,
  type StrataConfig,
} from "@/lib/strata";
import { ElevationCanvas } from "./canvas/elevation";
import { RouteCanvas } from "./canvas/route";
import { StrataCanvas } from "./canvas/strata";
import {
  type CanvasComponent,
  type CarouselTheme,
  defineCarouselTheme,
  type PanelComponent,
  type ResolveStyle,
} from "./define-theme";
import { FrameDatumPanel, FrameSignaturePanel } from "./panels/frame-panel";
import {
  PressBylinePanel,
  PressFrontPanel,
  PressSpreadPanel,
} from "./panels/press-panel";
import { EditorialSlide } from "./templates/editorial";
import { HeroSlide } from "./templates/hero";
import { StatGridSlide } from "./templates/stat-grid";

// The standard deck, shared by every theme whose signature is a canvas (Trace,
// Ascent, Strata) or the photo (Exposure): a hook, a stat grid, a wrap-up.
const STANDARD_PANELS: PanelComponent[] = [
  HeroSlide,
  StatGridSlide,
  EditorialSlide,
];
const FRAME_PANELS: PanelComponent[] = [
  FrameDatumPanel,
  FrameDatumPanel,
  FrameDatumPanel,
  FrameSignaturePanel,
];
const PRESS_PANELS: PanelComponent[] = [
  PressFrontPanel,
  PressSpreadPanel,
  PressSpreadPanel,
  PressBylinePanel,
];

/** STRATA's mood swaps the whole deck palette (background gradient, ink, the two
 *  ridge colours, light/dark) so it reads like the single card's moods, not a
 *  fixed token. */
function strataResolveStyle(
  base: EffectiveStyle,
  config: Record<string, unknown>
): EffectiveStyle {
  const cfg = config as StrataConfig;
  const m = STRATA_MOODS[cfg.mood ?? DEFAULT_STRATA_CONFIG.mood];
  return {
    ...base,
    background: m.bg,
    ink: m.text,
    mutedInk: m.faint,
    accent: m.routeColor,
    accent2: m.elevColor,
    onAccent: readableOn(m.routeColor),
    dark: !m.inkStat,
  };
}

/** Per-id render strategy: the spanning signature `canvas` (optional), the
 *  per-slide `panels`, and an optional `resolveStyle` post-processor. Everything
 *  else (identity, colour/photo policy, params) derives from the look tokens. */
interface Strategy {
  canvas?: CanvasComponent;
  panels: PanelComponent[];
  resolveStyle?: ResolveStyle;
}

const STRATEGY: Record<CarouselThemeId, Strategy> = {
  traceDawn: { canvas: RouteCanvas, panels: STANDARD_PANELS },
  traceDusk: { canvas: RouteCanvas, panels: STANDARD_PANELS },
  ascentDawn: { canvas: ElevationCanvas, panels: STANDARD_PANELS },
  ascentDusk: { canvas: ElevationCanvas, panels: STANDARD_PANELS },
  exposure: { panels: STANDARD_PANELS },
  frame: { panels: FRAME_PANELS },
  press: { panels: PRESS_PANELS },
  strata: {
    canvas: StrataCanvas,
    panels: STANDARD_PANELS,
    resolveStyle: strataResolveStyle,
  },
};

export const CAROUSEL_THEMES: Record<CarouselThemeId, CarouselTheme> =
  Object.fromEntries(
    CAROUSEL_THEME_ORDER.map((id) => {
      const look = CAROUSEL_THEME_TOKENS[id];
      const { canvas, panels, resolveStyle } = STRATEGY[id];
      return [
        id,
        defineCarouselTheme({
          id,
          label: look.label,
          tagline: look.tagline,
          uses: CAROUSEL_CAPABILITIES,
          look,
          canvas,
          panels,
          resolveStyle,
        }),
      ];
    })
  ) as Record<CarouselThemeId, CarouselTheme>;
