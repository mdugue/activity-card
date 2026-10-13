/**
 * Per-theme knobs of the woven family (see `lib/woven.ts` for the shared model).
 * Every woven theme carries METRICS; some add one bespoke knob for the thing
 * that most changes how their visualisation sits in the photo.
 */

import type { ParamDef } from "@/theme/core/params/kinds";

import { DEFAULT_WOVEN_CONFIG, METRICS_PARAM } from "./woven";
import type { WovenConfig } from "./woven";

// --- Light Trail: where the ground meets the sky -----------------------------

export interface LightTrailConfig extends WovenConfig {
  /** horizon height in % of the canvas, from the top */
  horizon: number;
}

export const DEFAULT_LIGHT_TRAIL_CONFIG: LightTrailConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  horizon: 56,
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
];

// --- Window: how wide the coloured band is -----------------------------------

export interface WindowConfig extends WovenConfig {
  /** width of the colour band along the route, in px on the 1080 master */
  band: number;
}

export const DEFAULT_WINDOW_CONFIG: WindowConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  band: 92,
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
];

// --- Contour: how many rings -------------------------------------------------

export interface ContourConfig extends WovenConfig {
  rings: number;
}

export const DEFAULT_CONTOUR_CONFIG: ContourConfig = {
  ...DEFAULT_WOVEN_CONFIG,
  rings: 11,
};

export const CONTOUR_PARAMS: ParamDef[] = [
  METRICS_PARAM,
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

// --- Slices: how finely the photo is cut -------------------------------------

export interface SlicesConfig extends WovenConfig {
  strips: number;
}

export const DEFAULT_SLICES_CONFIG: SlicesConfig = {
  ...DEFAULT_WOVEN_CONFIG,
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
];
