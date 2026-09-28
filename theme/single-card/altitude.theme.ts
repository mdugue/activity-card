// The ALTITUDE descriptor: identity, capability declaration, colour +
// photo policy and params — the row `SINGLE_CARD_THEMES` collects. Kept out of
// `altitude.tsx` so that module exports only its component (Fast Refresh).

import { ALTITUDE_PARAMS, DEFAULT_ALTITUDE_CONFIG } from "@/lib/altitude";
import { defineTheme } from "@/theme/core/theme-contract";

import { ThemeAltitude } from "./altitude";

const USES = [
  "elevation",
  "elevationViz",
  "heartRate",
  "location",
  "pace",
  "speed",
] as const;

export type AltitudeCapability = (typeof USES)[number];

export const altitudeTheme = defineTheme({
  Component: ThemeAltitude,
  // Fixed: white type + line over the photo is the design.
  colors: { default: { primary: "#ffffff" }, userAdjustable: false },
  defaults: DEFAULT_ALTITUDE_CONFIG,
  id: "altitude",
  label: "ALTITUDE",
  params: ALTITUDE_PARAMS,
  photo: { defaultOn: true },
  tagline: "elevation as headline",
  uses: USES,
});
