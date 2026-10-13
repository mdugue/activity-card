// The LIGHT TRAIL descriptor: identity, capability declaration, colour + photo
// policy and params — the row `SINGLE_CARD_THEMES` collects.

import {
  DEFAULT_LIGHT_TRAIL_CONFIG,
  LIGHT_TRAIL_PARAMS,
} from "@/lib/woven-themes";
import { defineTheme } from "@/theme/core/theme-contract";

import { LIGHT_TRAIL_FAST, LIGHT_TRAIL_SLOW } from "./default-accents";
import { ThemeLightTrail } from "./light-trail";

const USES = ["elevation", "location", "pace", "route", "speed"] as const;

export type LightTrailCapability = (typeof USES)[number];

export const lightTrailTheme = defineTheme({
  Component: ThemeLightTrail,
  // Slow → fast: the trail runs from the primary into the secondary hue.
  colors: {
    default: { primary: LIGHT_TRAIL_SLOW, secondary: LIGHT_TRAIL_FAST },
    userAdjustable: true,
  },
  defaults: DEFAULT_LIGHT_TRAIL_CONFIG,
  id: "trail",
  label: "LIGHT TRAIL",
  params: LIGHT_TRAIL_PARAMS,
  photo: { defaultOn: true },
  tagline: "the route as a long exposure",
  uses: USES,
});
