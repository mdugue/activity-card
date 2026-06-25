// localStorage persistence for the editor's UI preferences (theme choices,
// colour, visibility, per-theme configs, mode, athlete name) — including the
// read-side migrations that fold legacy persisted shapes onto the current
// model. Pure module: no React; `app/page.tsx` calls load on mount and save
// on change.

import type { CardMode } from "@/components/app/mode-toggle";
import {
  CAROUSEL_THEMES,
  type CarouselThemeId,
} from "@/theme/carousel/registry";
import { type ColorChoice, coerceColorChoice } from "@/theme/core/colors";
import type { Visibility } from "@/theme/core/visibility";
import type { ThemeId } from "@/theme/editor/render-theme";

const STORAGE_KEY = "effort:ui:v1";

export interface PersistedUi {
  // Legacy keys (pre-colour/param-schema): read once on load, migrated, and
  // dropped on the next save.
  accent?: unknown;
  altitudeConfig?: unknown;
  athleteName?: string;
  carouselTheme: CarouselThemeId;
  /** the user's colour choice; null/absent = the active theme's default */
  colorChoice?: unknown;
  mode: CardMode;
  photoMood?: unknown;
  strataConfig?: unknown;
  theme: ThemeId;
  /** per-theme parameter configs, keyed by theme/config key */
  themeConfigs: Record<string, unknown>;
  visibility: Visibility;
}

export function loadPersistedUi(): Partial<PersistedUi> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    // `JSON.parse("null")` returns null and `JSON.parse("42")` returns a
    // number — both would crash the property access on mount. Only accept
    // plain object shapes.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Partial<PersistedUi>;
  } catch {
    return {};
  }
}

export function savePersistedUi(payload: PersistedUi): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private mode, quota); soft-fail.
  }
}

export interface MigratedCarouselTheme {
  /** seed for the merged theme's ATMOSPHERE param (legacy Dusk/Dawn ids) */
  atmosphere?: "dawn" | "dusk";
  id: CarouselThemeId;
}

/** Pre-merge carousel ids (Trace/Ascent shipped as Dawn/Dusk pairs): map a
 *  stale persisted id onto the merged theme and carry the light choice into its
 *  ATMOSPHERE param. */
const LEGACY_CAROUSEL_THEMES: Record<string, MigratedCarouselTheme> = {
  traceDawn: { id: "trace", atmosphere: "dawn" },
  traceDusk: { id: "trace", atmosphere: "dusk" },
  ascentDawn: { id: "ascent", atmosphere: "dawn" },
  ascentDusk: { id: "ascent", atmosphere: "dusk" },
};

/** The persisted carousel selection, validated against the current theme set,
 *  with legacy Dawn/Dusk ids folded onto the merged themes. `null` = nothing
 *  usable persisted (keep the default). */
export function migrateCarouselTheme(
  persisted: Partial<PersistedUi>
): MigratedCarouselTheme | null {
  const stored = persisted.carouselTheme;
  if (!stored) {
    return null;
  }
  if (stored in CAROUSEL_THEMES) {
    return { id: stored };
  }
  return LEGACY_CAROUSEL_THEMES[stored] ?? null;
}

/** The persisted theme configs, with any legacy single-key configs (pre-param-
 *  schema) folded in so existing users keep their tuned themes. Each value is
 *  coerced on read by `resolveThemeConfig`, so raw migration is safe. */
export function migrateThemeConfigs(
  persisted: Partial<PersistedUi>,
  carousel: MigratedCarouselTheme | null
): Record<string, unknown> {
  const configs: Record<string, unknown> = { ...persisted.themeConfigs };
  if (persisted.altitudeConfig && configs.altitude === undefined) {
    configs.altitude = persisted.altitudeConfig;
  }
  if (persisted.strataConfig && configs.strata === undefined) {
    configs.strata = persisted.strataConfig;
  }
  if (carousel?.atmosphere && configs[carousel.id] === undefined) {
    configs[carousel.id] = { atmosphere: carousel.atmosphere };
  }
  return configs;
}

/** The persisted colour choice, with legacy formats folded in: the pre-round-2
 *  `accent` hex becomes a preset choice; a Photo-theme user's PhotoMood (or its
 *  round-1 `themeConfigs.photo.palette` form) becomes a photo-derived choice. */
export function migrateColorChoice(
  persisted: Partial<PersistedUi>
): ColorChoice | null {
  const direct = coerceColorChoice(persisted.colorChoice);
  if (direct) {
    return direct;
  }
  if (persisted.theme === "photo") {
    const photoCfg = persisted.themeConfigs?.photo as
      | { palette?: unknown }
      | undefined;
    const legacyMood = coerceColorChoice({
      kind: "photo",
      variant: photoCfg?.palette ?? persisted.photoMood,
    });
    if (legacyMood) {
      return legacyMood;
    }
  }
  if (typeof persisted.accent === "string") {
    return coerceColorChoice({
      kind: "preset",
      scheme: { primary: persisted.accent },
    });
  }
  return null;
}
