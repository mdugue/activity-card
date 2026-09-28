// The carousel theme registry — one `defineCarouselTheme` descriptor per theme,
// each fully self-contained: identity, the hand-tuned `look`, the spanning
// `canvas` and the per-slide `panels`. This is the carousel peer of
// `SINGLE_CARD_THEMES`; `CarouselDeck` renders any descriptor generically.
// Most themes share the standard `[Hero, StatGrid, Editorial]` panels and
// differ only by canvas + look; Frame and Press bring their own.

import {
  DEFAULT_STRATA_CONFIG,
  STRATA_MOODS,
  STRATA_PARAMS,
} from "@/lib/strata";
import type { StrataConfig } from "@/lib/strata";
import {
  ATMOSPHERE_PARAMS,
  DEFAULT_ATMOSPHERE_CONFIG,
} from "@/theme/carousel/atmosphere";
import type { AtmosphereConfig } from "@/theme/carousel/atmosphere";
import type { EffectiveStyle } from "@/theme/carousel/resolve";
import { readableOn } from "@/theme/carousel/resolve";
import { FONT_PAIRS } from "@/theme/carousel/theme-tokens";
import type { CarouselLook } from "@/theme/carousel/theme-tokens";

import { ElevationCanvas } from "./canvas/elevation";
import { RouteCanvas } from "./canvas/route";
import { StrataCanvas } from "./canvas/strata";
import { defineCarouselTheme } from "./define-theme";
import type {
  CarouselTheme,
  PanelComponent,
  ResolveStyle,
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
  | "trace"
  | "ascent"
  | "exposure"
  | "frame"
  | "press"
  | "strata";

export const DEFAULT_CAROUSEL_THEME: CarouselThemeId = "trace";

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

/**
 * The Dawn/Dusk pairing as a knob: when the ATMOSPHERE param is "dusk", swap
 * the deck onto the theme's dusk look — palette, light/dark flag, and the font
 * pair (serif → condensed bold). A user-picked accent survives the swap: only
 * accents still sitting at the dawn look's defaults move to the dusk set.
 */
const atmosphereResolveStyle =
  (dawn: CarouselLook, dusk: CarouselLook): ResolveStyle =>
  (base: EffectiveStyle, config: Record<string, unknown>) => {
    if ((config as AtmosphereConfig).atmosphere !== "dusk") {
      return base;
    }
    const userAccent = base.accent !== dawn.accent;
    const accent = userAccent ? base.accent : dusk.accent;
    const accent2 = base.accent2 === dawn.accent2 ? dusk.accent2 : base.accent2;
    const onAccent = userAccent ? base.onAccent : dusk.onAccent;
    return {
      ...base,
      accent,
      accent2,
      background: dusk.background,
      dark: dusk.dark,
      elevation: dusk.elevationAccent
        ? { fillFrom: accent, fillTo: dusk.background, line: accent }
        : dusk.elevation,
      fonts: FONT_PAIRS[dusk.fontPair],
      ink: dusk.ink,
      mutedInk: dusk.mutedInk,
      onAccent,
    };
  };

// Trace — route silhouette as an art-print. Dawn: serif on warm paper; Dusk:
// the same route after dark, condensed bold over warm black.
const TRACE_DAWN: CarouselLook = {
  accent: "#c45a2c",
  accent2: "#a98352",
  background: "#f1ebdf",
  contentAnchor: "bottom",
  crossViz: "elevation",
  dark: false,
  defaultFilter: "fade",
  defaultGrain: true,
  detailViz: false,
  elevation: { fillFrom: "#c45a2c", fillTo: "#f1ebdf", line: "#c45a2c" },
  fontPair: "serif",
  heroMetric: "distance",
  ink: "#211c17",
  mutedInk: "rgba(33,28,23,0.55)",
  onAccent: "#ffffff",
  routeStyle: "poster",
  veil: true,
};
const TRACE_DUSK: CarouselLook = {
  accent: "#e0683a",
  accent2: "#caa46a",
  background: "#16120e",
  contentAnchor: "bottom",
  crossViz: "elevation",
  dark: true,
  defaultFilter: "noir",
  defaultGrain: false,
  detailViz: false,
  elevation: { fillFrom: "#e0683a", fillTo: "#16120e", line: "#e0683a" },
  fontPair: "bold",
  heroMetric: "distance",
  ink: "#f3ede2",
  mutedInk: "rgba(243,237,226,0.6)",
  onAccent: "#16120e",
  routeStyle: "poster",
  veil: true,
};

// Ascent — the elevation mountain-range. Dawn: serif on alpine haze; Dusk: the
// range after dark, condensed bold.
const ASCENT_DAWN: CarouselLook = {
  accent: "#2f6f86",
  accent2: "#c4663a",
  background: "#eaedef",
  contentAnchor: "top",
  crossViz: "route",
  dark: false,
  defaultFilter: "fade",
  defaultGrain: true,
  detailViz: false,
  elevation: { fillFrom: "#2f6f86", fillTo: "#eaedef", line: "#2f6f86" },
  elevationAccent: true,
  fontPair: "serif",
  heroMetric: "elevation",
  ink: "#1a2026",
  mutedInk: "rgba(26,32,38,0.55)",
  onAccent: "#ffffff",
  routeStyle: "poster",
  veil: true,
};
const ASCENT_DUSK: CarouselLook = {
  accent: "#ff7a3c",
  accent2: "#5bc0d4",
  background: "#0c1116",
  contentAnchor: "top",
  crossViz: "route",
  dark: true,
  defaultFilter: "noir",
  defaultGrain: false,
  detailViz: false,
  elevation: { fillFrom: "#ff7a3c", fillTo: "#0c1116", line: "#ff7a3c" },
  elevationAccent: true,
  fontPair: "bold",
  heroMetric: "elevation",
  ink: "#f4f1ea",
  mutedInk: "rgba(244,241,234,0.6)",
  onAccent: "#0c1116",
  routeStyle: "poster",
  veil: true,
};

/** STRATA's mood swaps the whole deck palette (background gradient, ink, the two
 *  ridge colours, light/dark) so it reads like the single card's moods, not a
 *  fixed look. */
const strataResolveStyle = (
  base: EffectiveStyle,
  config: Record<string, unknown>
): EffectiveStyle => {
  const cfg = config as StrataConfig;
  const m = STRATA_MOODS[cfg.mood ?? DEFAULT_STRATA_CONFIG.mood];
  return {
    ...base,
    accent: m.routeColor,
    accent2: m.elevColor,
    background: m.bg,
    dark: !m.inkStat,
    ink: m.text,
    mutedInk: m.faint,
    onAccent: readableOn(m.routeColor),
  };
};

export const CAROUSEL_THEMES: Record<CarouselThemeId, CarouselTheme> = {
  // Trace — route silhouette as an art-print; ATMOSPHERE picks Dawn or Dusk.
  trace: defineCarouselTheme({
    canvas: RouteCanvas,
    defaults: DEFAULT_ATMOSPHERE_CONFIG,
    id: "trace",
    label: "TRACE",
    look: TRACE_DAWN,
    panels: STANDARD_PANELS,
    params: ATMOSPHERE_PARAMS,
    resolveStyle: atmosphereResolveStyle(TRACE_DAWN, TRACE_DUSK),
    tagline: "route, on paper",
  }),
  // Ascent — the elevation mountain-range; ATMOSPHERE picks Dawn or Dusk.
  ascent: defineCarouselTheme({
    canvas: ElevationCanvas,
    defaults: DEFAULT_ATMOSPHERE_CONFIG,
    id: "ascent",
    label: "ASCENT",
    look: ASCENT_DAWN,
    panels: STANDARD_PANELS,
    params: ATMOSPHERE_PARAMS,
    resolveStyle: atmosphereResolveStyle(ASCENT_DAWN, ASCENT_DUSK),
    tagline: "the range, in relief",
  }),
  // Exposure — full-bleed photo panorama, magazine masthead. The route +
  // elevation appear as small graphics on the detail slide (the photo is hero).
  exposure: defineCarouselTheme({
    id: "exposure",
    label: "EXPOSURE",
    look: {
      accent: "#e8c39e",
      accent2: "#c89d6e",
      background: "#121212",
      contentAnchor: "bottom",
      crossViz: "route",
      dark: true,
      defaultColorChoice: { kind: "photo", variant: "vibrant" },
      defaultFilter: "none",
      defaultGrain: false,
      detailViz: true,
      elevation: {
        fillFrom: "#ffffff",
        fillTo: "transparent",
        line: "#ffffff",
      },
      fontPair: "magazine",
      heroMetric: "distance",
      ink: "#ffffff",
      mutedInk: "rgba(255,255,255,0.78)",
      onAccent: "#0a0a0a",
      routeStyle: "desaturated",
      veil: true,
    },
    panels: STANDARD_PANELS,
    tagline: "photo, full-bleed",
  }),
  // Frame — ultra-minimal, one big datum + sparkline per slide, hairline rules.
  // Type-led: protects its own text (shadows), so no veil.
  frame: defineCarouselTheme({
    id: "frame",
    label: "FRAME",
    look: {
      accent: "#1a1714",
      accent2: "#c0341d",
      background: "#f7f5f1",
      contentAnchor: "bottom",
      dark: false,
      defaultFilter: "fade",
      defaultGrain: false,
      detailViz: false,
      elevation: { fillFrom: "#14110e", fillTo: "#f7f5f1", line: "#14110e" },
      fontPair: "grotesk",
      heroMetric: "distance",
      ink: "#14110e",
      mutedInk: "rgba(20,17,14,0.5)",
      onAccent: "#ffffff",
      routeStyle: "poster",
      veil: false,
    },
    panels: FRAME_PANELS,
    tagline: "one number at a time",
  }),
  // Press — editorial newspaper, serif headline, opaque print boxes over photo.
  // Small print-style path/altitude cuts ride along the spreads. No veil — the
  // opaque "clipping" boxes are the legibility device.
  press: defineCarouselTheme({
    id: "press",
    label: "PRESS",
    look: {
      accent: "#b1281a",
      accent2: "#1d3a2e",
      background: "#f2ece1",
      contentAnchor: "bottom",
      dark: false,
      defaultFilter: "mono",
      defaultGrain: true,
      detailViz: true,
      elevation: { fillFrom: "#14110d", fillTo: "#f2ece1", line: "#14110d" },
      fontPair: "magazine",
      heroMetric: "distance",
      ink: "#14110d",
      mutedInk: "rgba(20,17,13,0.58)",
      onAccent: "#ffffff",
      routeStyle: "poster",
      veil: false,
    },
    panels: PRESS_PANELS,
    tagline: "the broadsheet",
  }),
  // Strata — the generative woven morph-field is the spanning canvas: the route
  // ridge runs along the top, the elevation ridge along the bottom, the
  // abstraction fills the middle, and the swipe walks across the whole
  // topography. Mood (via resolveStyle), density and legend are adjustable.
  strata: defineCarouselTheme({
    canvas: StrataCanvas,
    defaults: DEFAULT_STRATA_CONFIG,
    id: "strata",
    label: "STRATA",
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
      elevation: { fillFrom: "#ff6a3a", fillTo: "#241335", line: "#ff6a3a" },
      heroMetric: "distance",
      contentAnchor: "bottom",
      veil: true,
      detailViz: false,
      // A background photo is optional: the woven field rides over it, the
      // same way the single card composes the field on a photo.
      defaultFilter: "none",
      defaultGrain: false,
    },
    panels: STANDARD_PANELS,
    params: STRATA_PARAMS,
    resolveStyle: strataResolveStyle,
    tagline: "woven topography",
  }),
};

/** Picker order — the canvas signatures first, then the type-led themes. */
export const CAROUSEL_THEME_ORDER: CarouselThemeId[] = [
  "trace",
  "ascent",
  "exposure",
  "frame",
  "press",
  "strata",
];
