// The single-card theme registry: one self-describing descriptor per theme
// (id, label/tagline, capability declaration, photo policy, params, component),
// collected from each theme file's `defineTheme` export. Everything the app
// needs — picker labels, editor availability, param specs, photo defaults,
// dispatch — derives from these rows; there is no parallel metadata table.

import type { SingleCardTheme } from "@/theme/core/theme-contract";
import { altitudeTheme } from "./altitude";
import { dataTheme } from "./data";
import { editorialTheme } from "./editorial";
import { pathTheme } from "./path";
import { photoTheme } from "./photo";
import { strataTheme } from "./strata";
import { triathlonTheme } from "./triathlon";

export const SINGLE_CARD_THEMES = {
  path: pathTheme,
  altitude: altitudeTheme,
  photo: photoTheme,
  data: dataTheme,
  editorial: editorialTheme,
  triathlon: triathlonTheme,
  strata: strataTheme,
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
