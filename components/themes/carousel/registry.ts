// The carousel theme registry — one `defineCarouselTheme` descriptor per theme,
// each fully self-contained: identity, the hand-tuned `look`, the spanning
// `canvas` and the per-slide `panels`. This is the carousel peer of
// `SINGLE_CARD_THEMES`; `CarouselDeck` renders any descriptor generically.
// Most themes share the standard `[Hero, StatGrid, Editorial]` panels and
// differ only by canvas + look; Frame and Press bring their own.

import type { EffectiveStyle } from "@/lib/carousel/resolve";
import { readableOn } from "@/lib/carousel/resolve";
import {
  DEFAULT_STRATA_CONFIG,
  STRATA_MOODS,
  STRATA_PARAMS,
  type StrataConfig,
} from "@/lib/strata";
import { ElevationCanvas } from "./canvas/elevation";
import { RouteCanvas } from "./canvas/route";
import { StrataCanvas } from "./canvas/strata";
import {
  type CarouselTheme,
  defineCarouselTheme,
  type PanelComponent,
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

/** Carousel theme identifiers. Add new families here freely — nothing ties this
 *  to the single-card theme count. */
export type CarouselThemeId =
  | "traceDawn"
  | "traceDusk"
  | "ascentDawn"
  | "ascentDusk"
  | "exposure"
  | "frame"
  | "press"
  | "strata";

export const DEFAULT_CAROUSEL_THEME: CarouselThemeId = "traceDawn";

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
 *  fixed look. */
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

export const CAROUSEL_THEMES: Record<CarouselThemeId, CarouselTheme> = {
  // Trace Dawn — route silhouette as an art-print on warm paper, serif.
  traceDawn: defineCarouselTheme({
    id: "traceDawn",
    label: "TRACE DAWN",
    tagline: "route, on paper",
    canvas: RouteCanvas,
    panels: STANDARD_PANELS,
    look: {
      dark: false,
      background: "#f1ebdf",
      ink: "#211c17",
      mutedInk: "rgba(33,28,23,0.55)",
      accent: "#c45a2c",
      accent2: "#a98352",
      onAccent: "#ffffff",
      fontPair: "serif",
      routeStyle: "poster",
      elevation: { line: "#c45a2c", fillFrom: "#c45a2c", fillTo: "#f1ebdf" },
      heroMetric: "distance",
      crossViz: "elevation",
      contentAnchor: "bottom",
      veil: true,
      detailViz: false,
      defaultFilter: "fade",
      defaultGrain: true,
    },
  }),
  // Trace Dusk — the same route, after dark; condensed bold over warm black.
  traceDusk: defineCarouselTheme({
    id: "traceDusk",
    label: "TRACE DUSK",
    tagline: "route, after dark",
    canvas: RouteCanvas,
    panels: STANDARD_PANELS,
    look: {
      dark: true,
      background: "#16120e",
      ink: "#f3ede2",
      mutedInk: "rgba(243,237,226,0.6)",
      accent: "#e0683a",
      accent2: "#caa46a",
      onAccent: "#16120e",
      fontPair: "bold",
      routeStyle: "poster",
      elevation: { line: "#e0683a", fillFrom: "#e0683a", fillTo: "#16120e" },
      heroMetric: "distance",
      crossViz: "elevation",
      contentAnchor: "bottom",
      veil: true,
      detailViz: false,
      defaultFilter: "noir",
      defaultGrain: false,
    },
  }),
  // Ascent Dawn — elevation mountain-range at first light, serif on alpine haze.
  ascentDawn: defineCarouselTheme({
    id: "ascentDawn",
    label: "ASCENT DAWN",
    tagline: "the range at first light",
    canvas: ElevationCanvas,
    panels: STANDARD_PANELS,
    look: {
      dark: false,
      background: "#eaedef",
      ink: "#1a2026",
      mutedInk: "rgba(26,32,38,0.55)",
      accent: "#2f6f86",
      accent2: "#c4663a",
      onAccent: "#ffffff",
      fontPair: "serif",
      routeStyle: "poster",
      elevation: { line: "#2f6f86", fillFrom: "#2f6f86", fillTo: "#eaedef" },
      elevationAccent: true,
      heroMetric: "elevation",
      crossViz: "route",
      contentAnchor: "top",
      veil: true,
      detailViz: false,
      defaultFilter: "fade",
      defaultGrain: true,
    },
  }),
  // Ascent Dusk — the alpine range after dark; condensed bold (was Altitude).
  ascentDusk: defineCarouselTheme({
    id: "ascentDusk",
    label: "ASCENT DUSK",
    tagline: "the range after dark",
    canvas: ElevationCanvas,
    panels: STANDARD_PANELS,
    look: {
      dark: true,
      background: "#0c1116",
      ink: "#f4f1ea",
      mutedInk: "rgba(244,241,234,0.6)",
      accent: "#ff7a3c",
      accent2: "#5bc0d4",
      onAccent: "#0c1116",
      fontPair: "bold",
      routeStyle: "poster",
      elevation: { line: "#ff7a3c", fillFrom: "#ff7a3c", fillTo: "#0c1116" },
      elevationAccent: true,
      heroMetric: "elevation",
      crossViz: "route",
      contentAnchor: "top",
      veil: true,
      detailViz: false,
      defaultFilter: "noir",
      defaultGrain: false,
    },
  }),
  // Exposure — full-bleed photo panorama, magazine masthead. The route +
  // elevation appear as small graphics on the detail slide (the photo is hero).
  exposure: defineCarouselTheme({
    id: "exposure",
    label: "EXPOSURE",
    tagline: "photo, full-bleed",
    panels: STANDARD_PANELS,
    look: {
      dark: true,
      background: "#121212",
      ink: "#ffffff",
      mutedInk: "rgba(255,255,255,0.78)",
      accent: "#e8c39e",
      accent2: "#c89d6e",
      onAccent: "#0a0a0a",
      fontPair: "magazine",
      routeStyle: "desaturated",
      elevation: {
        line: "#ffffff",
        fillFrom: "#ffffff",
        fillTo: "transparent",
      },
      heroMetric: "distance",
      crossViz: "route",
      contentAnchor: "bottom",
      veil: true,
      detailViz: true,
      defaultColorChoice: { kind: "photo", variant: "vibrant" },
      defaultFilter: "none",
      defaultGrain: false,
    },
  }),
  // Frame — ultra-minimal, one big datum + sparkline per slide, hairline rules.
  // Type-led: protects its own text (shadows), so no veil.
  frame: defineCarouselTheme({
    id: "frame",
    label: "FRAME",
    tagline: "one number at a time",
    panels: FRAME_PANELS,
    look: {
      dark: false,
      background: "#f7f5f1",
      ink: "#14110e",
      mutedInk: "rgba(20,17,14,0.5)",
      accent: "#1a1714",
      accent2: "#c0341d",
      onAccent: "#ffffff",
      fontPair: "grotesk",
      routeStyle: "poster",
      elevation: { line: "#14110e", fillFrom: "#14110e", fillTo: "#f7f5f1" },
      heroMetric: "distance",
      contentAnchor: "bottom",
      veil: false,
      detailViz: false,
      defaultFilter: "fade",
      defaultGrain: false,
    },
  }),
  // Press — editorial newspaper, serif headline, opaque print boxes over photo.
  // Small print-style path/altitude cuts ride along the spreads. No veil — the
  // opaque "clipping" boxes are the legibility device.
  press: defineCarouselTheme({
    id: "press",
    label: "PRESS",
    tagline: "the broadsheet",
    panels: PRESS_PANELS,
    look: {
      dark: false,
      background: "#f2ece1",
      ink: "#14110d",
      mutedInk: "rgba(20,17,13,0.58)",
      accent: "#b1281a",
      accent2: "#1d3a2e",
      onAccent: "#ffffff",
      fontPair: "magazine",
      routeStyle: "poster",
      elevation: { line: "#14110d", fillFrom: "#14110d", fillTo: "#f2ece1" },
      heroMetric: "distance",
      contentAnchor: "bottom",
      veil: false,
      detailViz: true,
      defaultFilter: "mono",
      defaultGrain: true,
    },
  }),
  // Strata — the generative woven morph-field is the spanning canvas: the route
  // ridge runs along the top, the elevation ridge along the bottom, the
  // abstraction fills the middle, and the swipe walks across the whole
  // topography. Mood (via resolveStyle), density and legend are adjustable.
  strata: defineCarouselTheme({
    id: "strata",
    label: "STRATA",
    tagline: "woven topography",
    canvas: StrataCanvas,
    panels: STANDARD_PANELS,
    params: STRATA_PARAMS,
    defaults: DEFAULT_STRATA_CONFIG,
    resolveStyle: strataResolveStyle,
    look: {
      dark: true,
      background:
        "linear-gradient(180deg, #241335 0%, #5e2450 32%, #b1402c 64%, #ec8a3c 100%)",
      ink: "#f8ead7",
      mutedInk: "rgba(248,234,215,0.62)",
      accent: "#ffd98a",
      accent2: "#ff6a3a",
      onAccent: "#241335",
      fontPair: "syne",
      routeStyle: "poster",
      elevation: { line: "#ff6a3a", fillFrom: "#ff6a3a", fillTo: "#241335" },
      heroMetric: "distance",
      contentAnchor: "bottom",
      veil: true,
      detailViz: false,
      // A background photo is optional: the woven field rides over it, the
      // same way the single card composes the field on a photo.
      defaultFilter: "none",
      defaultGrain: false,
    },
  }),
};

/** Picker order — Dawn/Dusk pairs first, then the type-led themes. */
export const CAROUSEL_THEME_ORDER: CarouselThemeId[] = [
  "traceDawn",
  "traceDusk",
  "ascentDawn",
  "ascentDusk",
  "exposure",
  "frame",
  "press",
  "strata",
];
