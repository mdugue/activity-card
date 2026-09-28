// The TRIATHLON descriptor: identity, capability declaration, colour +
// photo policy — the row `SINGLE_CARD_THEMES` collects. Kept out of
// `triathlon.tsx` so that module exports only its component (Fast Refresh).

import { defineTheme } from "@/theme/core/theme-contract";

import { ThemeTriathlon } from "./triathlon";

const USES = ["athleteName", "location"] as const;

export type TriathlonCapability = (typeof USES)[number];

export const triathlonTheme = defineTheme({
  Component: ThemeTriathlon,
  // Fixed: the per-discipline swim/bike/run colour identity IS the theme.
  colors: { default: { primary: "#11151a" }, userAdjustable: false },
  id: "triathlon",
  label: "TRIATHLON",
  photo: { defaultOn: false },
  tagline: "multi-sport",
  uses: USES,
});
