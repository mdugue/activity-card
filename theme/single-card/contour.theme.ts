// The CONTOUR descriptor: identity, capability declaration, colour + photo
// policy and params — the row `SINGLE_CARD_THEMES` collects.

import { DEFAULT_CONTOUR_CONFIG, CONTOUR_PARAMS } from "@/lib/woven-themes";
import { defineTheme } from "@/theme/core/theme-contract";

import { ThemeContour } from "./contour";
import { CONTOUR_ACCENT } from "./default-accents";

const USES = [
  "elevation",
  "elevationViz",
  "location",
  "pace",
  "route",
  "speed",
] as const;

export type ContourCapability = (typeof USES)[number];

export const contourTheme = defineTheme({
  Component: ThemeContour,
  // The rings warm from pale paper into the accent towards the summit.
  colors: { default: { primary: CONTOUR_ACCENT }, userAdjustable: true },
  defaults: DEFAULT_CONTOUR_CONFIG,
  id: "contour",
  label: "CONTOUR",
  params: CONTOUR_PARAMS,
  photo: { defaultOn: true },
  tagline: "the route as a height map",
  uses: USES,
});
