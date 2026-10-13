// The RIDGE descriptor: identity, capability declaration, colour + photo
// policy and params — the row `SINGLE_CARD_THEMES` collects.

import { DEFAULT_WOVEN_CONFIG, WOVEN_PARAMS } from "@/lib/woven";
import { defineTheme } from "@/theme/core/theme-contract";

import { RIDGE_TINT } from "./default-accents";
import { ThemeRidge } from "./ridge";

const USES = [
  "elevation",
  "elevationViz",
  "location",
  "pace",
  "speed",
] as const;

export type RidgeCapability = (typeof USES)[number];

export const ridgeTheme = defineTheme({
  Component: ThemeRidge,
  // The accent tones the sky above the ridge.
  colors: { default: { primary: RIDGE_TINT }, userAdjustable: true },
  defaults: DEFAULT_WOVEN_CONFIG,
  id: "ridge",
  label: "RIDGE",
  params: WOVEN_PARAMS,
  photo: { defaultOn: true },
  tagline: "the climb as a new horizon",
  uses: USES,
});
