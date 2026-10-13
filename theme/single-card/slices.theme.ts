// The SLICES descriptor: identity, capability declaration, colour + photo
// policy and params — the row `SINGLE_CARD_THEMES` collects.

import { DEFAULT_SLICES_CONFIG, SLICES_PARAMS } from "@/lib/woven-themes";
import { defineTheme } from "@/theme/core/theme-contract";

import { ThemeSlices } from "./slices";

const USES = [
  "elevation",
  "elevationViz",
  "location",
  "pace",
  "speed",
] as const;

export type SlicesCapability = (typeof USES)[number];

export const slicesTheme = defineTheme({
  Component: ThemeSlices,
  // Fixed: the photo is the colour; the cut edge stays white.
  colors: { default: { primary: "#ffffff" }, userAdjustable: false },
  defaults: DEFAULT_SLICES_CONFIG,
  id: "slices",
  label: "SLICES",
  params: SLICES_PARAMS,
  photo: { defaultOn: true },
  tagline: "the photo cut to the profile",
  uses: USES,
});
