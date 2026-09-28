// The PATH descriptor: identity, capability declaration, colour +
// photo policy — the row `SINGLE_CARD_THEMES` collects. Kept out of
// `path.tsx` so that module exports only its component (Fast Refresh).

import { defineTheme } from "@/theme/core/theme-contract";

import { PATH_ACCENT } from "./default-accents";
import { ThemePath } from "./path";

const USES = [
  "athleteName",
  "elevation",
  "location",
  "pace",
  "route",
  "speed",
] as const;

export type PathCapability = (typeof USES)[number];

export const pathTheme = defineTheme({
  Component: ThemePath,
  colors: { default: { primary: PATH_ACCENT }, userAdjustable: true },
  id: "path",
  label: "PATH",
  photo: { defaultOn: true },
  tagline: "route is the hero",
  uses: USES,
});
