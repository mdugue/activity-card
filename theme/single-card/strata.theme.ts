// The STRATA descriptor: identity, capability declaration, colour +
// photo policy and params — the row `SINGLE_CARD_THEMES` collects. Kept out of
// `strata.tsx` so that module exports only its component (Fast Refresh).

import { DEFAULT_STRATA_CONFIG, STRATA_PARAMS } from "@/lib/strata";
import { defineTheme } from "@/theme/core/theme-contract";

import { ThemeStrata } from "./strata";

const USES = [
  "elevation",
  "elevationViz",
  "location",
  "pace",
  "route",
] as const;

export type StrataCapability = (typeof USES)[number];

export const strataTheme = defineTheme({
  Component: ThemeStrata,
  // Fixed: the mood param drives the whole palette.
  colors: {
    default: { primary: "#ffd98a", secondary: "#ff6a3a" },
    userAdjustable: false,
  },
  defaults: DEFAULT_STRATA_CONFIG,
  id: "strata",
  label: "STRATA",
  params: STRATA_PARAMS,
  photo: { defaultOn: false },
  tagline: "woven topography",
  uses: USES,
});
