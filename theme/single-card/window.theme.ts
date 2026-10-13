// The WINDOW descriptor: identity, capability declaration, colour + photo
// policy and params — the row `SINGLE_CARD_THEMES` collects.

import { DEFAULT_WINDOW_CONFIG, WINDOW_PARAMS } from "@/lib/woven-themes";
import { defineTheme } from "@/theme/core/theme-contract";

import { ThemeWindow } from "./window";

const USES = ["elevation", "location", "pace", "route", "speed"] as const;

export type WindowCapability = (typeof USES)[number];

export const windowTheme = defineTheme({
  Component: ThemeWindow,
  // Fixed: the photo's own colours are the accent.
  colors: { default: { primary: "#ffffff" }, userAdjustable: false },
  defaults: DEFAULT_WINDOW_CONFIG,
  id: "window",
  label: "WINDOW",
  params: WINDOW_PARAMS,
  photo: { defaultOn: true },
  tagline: "colour only where you went",
  uses: USES,
});
