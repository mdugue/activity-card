// The single-card theme registry: one self-describing descriptor per theme
// (id, label/tagline, capability declaration, photo policy, params, component),
// collected from each theme's `<name>.theme.ts` `defineTheme` export. Everything the app
// needs — picker labels, editor availability, param specs, photo defaults,
// dispatch — derives from these rows; there is no parallel metadata table.

import type { SingleCardTheme } from "@/theme/core/theme-contract";

import { altitudeTheme } from "./altitude.theme";
import { dataTheme } from "./data.theme";
import { editorialTheme } from "./editorial.theme";
import { pathTheme } from "./path.theme";
import { photoTheme } from "./photo.theme";
import { strataTheme } from "./strata.theme";
import { triathlonTheme } from "./triathlon.theme";

export const SINGLE_CARD_THEMES = {
  altitude: altitudeTheme,
  data: dataTheme,
  editorial: editorialTheme,
  path: pathTheme,
  photo: photoTheme,
  strata: strataTheme,
  triathlon: triathlonTheme,
} as const satisfies Record<string, SingleCardTheme>;

export type ThemeId = keyof typeof SINGLE_CARD_THEMES;

export const THEME_ORDER: ThemeId[] = [
  "altitude",
  "photo",
  "strata",
  "path",
  "editorial",
  "data",
  "triathlon",
];
