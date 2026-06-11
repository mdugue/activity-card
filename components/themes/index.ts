// The single-card theme registry: one self-describing descriptor per theme
// (id, label/tagline, capability declaration, photo policy, params, component),
// collected from each theme file's `defineTheme` export. Everything the app
// needs — picker labels, editor availability, param specs, photo defaults,
// dispatch — derives from these rows; there is no parallel metadata table.

import type { SingleCardTheme } from "@/lib/theme-contract";
import { altitudeTheme } from "./single-card/altitude";
import { dataTheme } from "./single-card/data";
import { editorialTheme } from "./single-card/editorial";
import { minimalTheme } from "./single-card/minimal";
import { pathTheme } from "./single-card/path";
import { photoTheme } from "./single-card/photo";
import { strataTheme } from "./single-card/strata";
import { triathlonTheme } from "./single-card/triathlon";

export const SINGLE_CARD_THEMES = {
  path: pathTheme,
  altitude: altitudeTheme,
  photo: photoTheme,
  minimal: minimalTheme,
  data: dataTheme,
  editorial: editorialTheme,
  triathlon: triathlonTheme,
  strata: strataTheme,
} as const satisfies Record<string, SingleCardTheme>;

export type ThemeId = keyof typeof SINGLE_CARD_THEMES;

export const THEME_ORDER: ThemeId[] = [
  "path",
  "altitude",
  "photo",
  "minimal",
  "data",
  "editorial",
  "triathlon",
  "strata",
];
