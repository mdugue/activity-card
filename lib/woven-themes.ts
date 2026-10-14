/**
 * Per-theme knobs of the woven family (see `lib/woven.ts` for the shared model).
 * Every woven theme carries METRICS; each adds the few knobs that most change
 * how its visualisation sits in the photo.
 */

import type { ParamDef } from "@/theme/core/params/kinds";

import { DEFAULT_WOVEN_CONFIG, METRICS_PARAM } from "./woven";
import type { WovenConfig } from "./woven";

// --- Ridge: where the second horizon runs ------------------------------------

export type RidgeTone = "duotone" | "mono" | "night";

export interface RidgeConfig extends WovenConfig {
  /** how tall the profile stands, in % of the canvas height */
  height: number;
  /** the profile's lowest point, in % of the canvas height from the top */
  position: number;
  /** tilt of the whole ridge, in degrees (clockwise) */
  tilt: number;
  /** how the photo is toned above the ridge */
  tone: RidgeTone;
}

export const DEFAULT_RIDGE_CONFIG: RidgeConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  height: 22,
  position: 52,
  tilt: 0,
  tone: "duotone",
};

export const RIDGE_PARAMS: ParamDef[] = [
  METRICS_PARAM,
  {
    default: DEFAULT_RIDGE_CONFIG.tone,
    group: "style",
    id: "tone",
    kind: "segmented",
    label: "SKY",
    options: [
      { blurb: "accent duotone", id: "duotone", label: "TINT" },
      { blurb: "black & white", id: "mono", label: "MONO" },
      { blurb: "dark & quiet", id: "night", label: "NIGHT" },
    ],
  },
  {
    default: DEFAULT_RIDGE_CONFIG.position,
    group: "layout",
    id: "position",
    kind: "slider",
    label: "POSITION",
    max: 82,
    min: 30,
    step: 1,
    unit: "%",
  },
  {
    default: DEFAULT_RIDGE_CONFIG.height,
    group: "layout",
    id: "height",
    kind: "slider",
    label: "HEIGHT",
    max: 40,
    min: 8,
    step: 1,
    unit: "%",
  },
  {
    default: DEFAULT_RIDGE_CONFIG.tilt,
    group: "layout",
    id: "tilt",
    kind: "slider",
    label: "ROTATION",
    max: 30,
    min: -30,
    step: 1,
    unit: "°",
  },
];

// --- Light Trail: where the ground meets the sky -----------------------------

export interface LightTrailConfig extends WovenConfig {
  /** height of the speed curtain over the trail, 0 = off */
  curtain: number;
  /** horizon height in % of the canvas, from the top */
  horizon: number;
}

export const DEFAULT_LIGHT_TRAIL_CONFIG: LightTrailConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  curtain: 60,
  horizon: 48,
};

export const LIGHT_TRAIL_PARAMS: ParamDef[] = [
  METRICS_PARAM,
  {
    default: DEFAULT_LIGHT_TRAIL_CONFIG.horizon,
    group: "layout",
    id: "horizon",
    kind: "slider",
    label: "HORIZON",
    max: 75,
    min: 30,
    step: 1,
    unit: "%",
  },
  {
    default: DEFAULT_LIGHT_TRAIL_CONFIG.curtain,
    group: "style",
    id: "curtain",
    kind: "slider",
    label: "SPEED LIGHT",
    max: 100,
    min: 0,
    step: 5,
    unit: "%",
  },
];

// --- Window: how wide the coloured band is, and how it stands out -----------

export type WindowEdge = "shadow" | "line" | "both" | "none";

export interface WindowConfig extends WovenConfig {
  /** width of the colour band along the route, in px on the 1080 master */
  band: number;
  /** what separates the band from the toned photo around it */
  edge: WindowEdge;
}

export const DEFAULT_WINDOW_CONFIG: WindowConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  band: 84,
  edge: "both",
};

export const WINDOW_PARAMS: ParamDef[] = [
  METRICS_PARAM,
  {
    default: DEFAULT_WINDOW_CONFIG.band,
    group: "layout",
    id: "band",
    kind: "slider",
    label: "BAND WIDTH",
    max: 180,
    min: 24,
    step: 4,
    unit: "px",
  },
  {
    default: DEFAULT_WINDOW_CONFIG.edge,
    group: "style",
    id: "edge",
    kind: "segmented",
    label: "EDGE",
    options: [
      { blurb: "lifted", id: "shadow", label: "SHADOW" },
      { blurb: "hairline", id: "line", label: "LINE" },
      { blurb: "both", id: "both", label: "BOTH" },
      { blurb: "flush", id: "none", label: "NONE" },
    ],
  },
];

// --- Contour: how many rings, and where the map hangs -----------------------

export type ContourPlacement = "auto" | "hero" | "side" | "corner" | "low";

export interface ContourConfig extends WovenConfig {
  placement: ContourPlacement;
  rings: number;
}

export const DEFAULT_CONTOUR_CONFIG: ContourConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  placement: "auto",
  rings: 11,
};

export const CONTOUR_PARAMS: ParamDef[] = [
  METRICS_PARAM,
  {
    default: DEFAULT_CONTOUR_CONFIG.placement,
    group: "layout",
    id: "placement",
    kind: "segmented",
    label: "PLACEMENT",
    options: [
      { blurb: "fits the route", id: "auto", label: "AUTO" },
      { blurb: "under the title", id: "hero", label: "HERO" },
      { blurb: "a tall column", id: "side", label: "SIDE" },
      { blurb: "small, top right", id: "corner", label: "CORNER" },
      { blurb: "low, sky free", id: "low", label: "LOW" },
    ],
  },
  {
    default: DEFAULT_CONTOUR_CONFIG.rings,
    group: "layout",
    id: "rings",
    kind: "slider",
    label: "RINGS",
    max: 18,
    min: 4,
    step: 1,
  },
];

// --- Word Path: how large the writing is -------------------------------------

export interface WordPathConfig extends WovenConfig {
  /** letter size in px on the 1080 master */
  size: number;
}

export const DEFAULT_WORD_PATH_CONFIG: WordPathConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  size: 20,
};

export const WORD_PATH_PARAMS: ParamDef[] = [
  METRICS_PARAM,
  {
    default: DEFAULT_WORD_PATH_CONFIG.size,
    group: "text",
    id: "size",
    kind: "slider",
    label: "LETTER SIZE",
    max: 40,
    min: 12,
    step: 1,
    unit: "px",
  },
];

// --- Slices: how finely the photo is cut, and how far it lifts ---------------

export interface SlicesConfig extends WovenConfig {
  /** how far the highest strip lifts, in % of the canvas height */
  relief: number;
  strips: number;
}

export const DEFAULT_SLICES_CONFIG: SlicesConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  relief: 28,
  strips: 30,
};

export const SLICES_PARAMS: ParamDef[] = [
  METRICS_PARAM,
  {
    default: DEFAULT_SLICES_CONFIG.strips,
    group: "layout",
    id: "strips",
    kind: "slider",
    label: "STRIPS",
    max: 64,
    min: 12,
    step: 1,
  },
  {
    default: DEFAULT_SLICES_CONFIG.relief,
    group: "layout",
    id: "relief",
    kind: "slider",
    label: "RELIEF",
    max: 45,
    min: 10,
    step: 1,
    unit: "%",
  },
];
