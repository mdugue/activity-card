// The EDITORIAL descriptor: identity, capability declaration, colour +
// photo policy — the row `SINGLE_CARD_THEMES` collects. Kept out of
// `editorial.tsx` so that module exports only its component (Fast Refresh).

import { defineTheme } from "@/theme/core/theme-contract";

import { EDITORIAL_ACCENT } from "./default-accents";
import { ThemeEditorial } from "./editorial";

const USES = [
  "athleteName",
  "cadence",
  "elevation",
  "heartRate",
  "location",
  "pace",
  "route",
  "speed",
] as const;

export type EditorialCapability = (typeof USES)[number];

export const editorialTheme = defineTheme({
  Component: ThemeEditorial,
  colors: { default: { primary: EDITORIAL_ACCENT }, userAdjustable: true },
  id: "editorial",
  label: "EDITORIAL",
  photo: { defaultOn: true },
  tagline: "typography led",
  uses: USES,
  usesWhen: {
    // The figures table is sport-specific: elevation + speed rows are ride-only,
    // cadence is run-only, pace appears for runs and swims.
    cadence: (d) => d.sport === "run",
    elevation: (d) => d.sport === "ride",
    pace: (d) => d.sport === "run" || d.sport === "swim",
    speed: (d) => d.sport === "ride",
  },
});
