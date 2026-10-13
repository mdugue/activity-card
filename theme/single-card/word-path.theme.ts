// The WORD PATH descriptor: identity, capability declaration, colour + photo
// policy and params — the row `SINGLE_CARD_THEMES` collects.

import { DEFAULT_WOVEN_CONFIG, WOVEN_PARAMS } from "@/lib/woven";
import { defineTheme } from "@/theme/core/theme-contract";

import { WORD_PATH_ACCENT } from "./default-accents";
import { ThemeWordPath } from "./word-path";

const USES = ["elevation", "location", "pace", "route", "speed"] as const;

export type WordPathCapability = (typeof USES)[number];

export const wordPathTheme = defineTheme({
  Component: ThemeWordPath,
  // The accent marks the start of the band.
  colors: { default: { primary: WORD_PATH_ACCENT }, userAdjustable: true },
  defaults: DEFAULT_WOVEN_CONFIG,
  id: "wordpath",
  label: "WORD PATH",
  params: WOVEN_PARAMS,
  photo: { defaultOn: true },
  tagline: "the route, written out",
  uses: USES,
});
