// The DATA descriptor: identity, capability declaration, colour +
// photo policy — the row `SINGLE_CARD_THEMES` collects. Kept out of
// `data.tsx` so that module exports only its component (Fast Refresh).

import { defineTheme } from "@/theme/core/theme-contract";

import { ThemeData } from "./data";
import { DATA_ACCENT } from "./default-accents";

// Every capability — so `ThemeData` takes the full default `ThemeProps`.
const USES = [
  "athleteName",
  "cadence",
  "elevation",
  "elevationViz",
  "heartRate",
  "location",
  "pace",
  "power",
  "route",
  "speed",
  "splits",
] as const;

export const dataTheme = defineTheme({
  Component: ThemeData,
  colors: { default: { primary: DATA_ACCENT }, userAdjustable: true },
  id: "data",
  label: "DATA",
  photo: { defaultOn: false },
  tagline: "dashboard poster",
  uses: USES,
});
