// localStorage persistence for the editor's UI preferences (theme choices,
// colour, visibility, per-theme configs, mode, athlete name) — including the
// read-side migrations that fold legacy persisted shapes onto the current
// model. Pure module: no React; `app/page.tsx` calls load on mount and save
// on change.
//
// Storage is untrusted (older builds, hand edits, other tabs), so the loader
// parses it field by field at this boundary: a field that doesn't have its
// expected shape is dropped on its own, and everything downstream works with
// typed values.

import { z } from "zod/mini";

import type { CardMode } from "@/components/app/mode-toggle";
import { CAROUSEL_THEMES } from "@/theme/carousel/registry";
import type { CarouselThemeId } from "@/theme/carousel/registry";
import { coerceColorChoice } from "@/theme/core/colors";
import type { ColorChoice } from "@/theme/core/colors";
import type { ThemeConfig } from "@/theme/core/params/kinds";
import { DEFAULT_VISIBILITY } from "@/theme/core/visibility";
import type { Visibility } from "@/theme/core/visibility";
import type { ThemeId } from "@/theme/editor/render-theme";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";

const STORAGE_KEY = "effort:ui:v1";

/** Per-theme parameter configs, keyed by theme/config key. A slot is absent
 *  until the user tunes that theme. */
export type ThemeConfigs = Partial<Record<string, ThemeConfig>>;

/** The shape written to storage. */
export interface PersistedUi {
  athleteName?: string;
  carouselTheme: CarouselThemeId;
  /** the user's colour choice; absent = the active theme's default */
  colorChoice?: ColorChoice;
  mode: CardMode;
  theme: ThemeId;
  themeConfigs: ThemeConfigs;
  visibility: Visibility;
}

/** What a load yields: every field optional (and individually validated),
 *  plus the legacy keys (pre-colour/param-schema) that are read once,
 *  migrated, and dropped on the next save. */
export interface LoadedUi {
  /** legacy: the pre-round-2 accent hex */
  accent?: string;
  /** legacy: the pre-param-schema Altitude config */
  altitudeConfig?: ThemeConfig;
  athleteName?: string;
  /** a current carousel theme id, or a legacy Dawn/Dusk one */
  carouselTheme?: string;
  colorChoice?: ColorChoice;
  mode?: CardMode;
  /** legacy: the Photo theme's mood (a palette variant id) */
  photoMood?: string;
  /** legacy: the pre-param-schema STRATA config */
  strataConfig?: ThemeConfig;
  theme?: ThemeId;
  themeConfigs?: ThemeConfigs;
  visibility?: Partial<Visibility>;
}

const isThemeId = (id: string): id is ThemeId =>
  Object.hasOwn(SINGLE_CARD_THEMES, id);

const isCarouselThemeId = (id: string): id is CarouselThemeId =>
  Object.hasOwn(CAROUSEL_THEMES, id);

const isVisibilityKey = (key: string): key is keyof Visibility =>
  Object.hasOwn(DEFAULT_VISIBILITY, key);

/** Any plain object, values unchecked — the outer shape of every record read. */
const rawRecordSchema = z.record(z.string(), z.unknown());
const paramValueSchema = z.union([z.boolean(), z.number(), z.string()]);
const booleanSchema = z.boolean();

/** A persisted config slot: keeps the entries that hold a param value. Each
 *  read is coerced against the theme's params (`coerceConfig`), which rejects
 *  anything else anyway. */
const themeConfigSchema = z.pipe(
  rawRecordSchema,
  z.transform((raw) => {
    const config: ThemeConfig = {};
    for (const [key, value] of Object.entries(raw)) {
      const parsed = paramValueSchema.safeParse(value);
      if (parsed.success) {
        config[key] = parsed.data;
      }
    }
    return config;
  })
);

const themeConfigsSchema = z.pipe(
  rawRecordSchema,
  z.transform((raw) => {
    const configs: ThemeConfigs = {};
    for (const [key, value] of Object.entries(raw)) {
      const parsed = themeConfigSchema.safeParse(value);
      if (parsed.success) {
        configs[key] = parsed.data;
      }
    }
    return configs;
  })
);

/** Persisted visibility: keeps the known switches that hold a boolean. */
const visibilitySchema = z.pipe(
  rawRecordSchema,
  z.transform((raw) => {
    const visibility: Partial<Visibility> = {};
    for (const [key, value] of Object.entries(raw)) {
      const parsed = booleanSchema.safeParse(value);
      if (isVisibilityKey(key) && parsed.success) {
        visibility[key] = parsed.data;
      }
    }
    return visibility;
  })
);

const stringSchema = z.string();
const modeSchema = z.enum(["single", "carousel"]);

export const loadPersistedUi = (): LoadedUi => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === "") {
      return {};
    }
    // `JSON.parse("null")` returns null and `JSON.parse("42")` returns a
    // number — both would crash the property access on mount. Only accept
    // plain object shapes.
    const record = rawRecordSchema.safeParse(JSON.parse(raw));
    if (!record.success) {
      return {};
    }
    const stored = record.data;
    const pick = <T>(schema: z.ZodMiniType<T>, key: string): T | undefined => {
      const parsed = schema.safeParse(stored[key]);
      return parsed.success ? parsed.data : undefined;
    };
    const theme = pick(stringSchema, "theme");
    return {
      accent: pick(stringSchema, "accent"),
      altitudeConfig: pick(themeConfigSchema, "altitudeConfig"),
      athleteName: pick(stringSchema, "athleteName"),
      carouselTheme: pick(stringSchema, "carouselTheme"),
      colorChoice: coerceColorChoice(stored.colorChoice) ?? undefined,
      mode: pick(modeSchema, "mode"),
      photoMood: pick(stringSchema, "photoMood"),
      strataConfig: pick(themeConfigSchema, "strataConfig"),
      // Validate against the current theme set: a stale id from an older
      // build or hand-edited storage would otherwise throw downstream on the
      // registry lookup.
      theme: theme !== undefined && isThemeId(theme) ? theme : undefined,
      themeConfigs: pick(themeConfigsSchema, "themeConfigs"),
      visibility: pick(visibilitySchema, "visibility"),
    };
  } catch {
    return {};
  }
};

export const savePersistedUi = (payload: PersistedUi): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private mode, quota); soft-fail.
  }
};

export interface MigratedCarouselTheme {
  /** seed for the merged theme's ATMOSPHERE param (legacy Dusk/Dawn ids) */
  atmosphere?: "dawn" | "dusk";
  id: CarouselThemeId;
}

/** Pre-merge carousel ids (Trace/Ascent shipped as Dawn/Dusk pairs): map a
 *  stale persisted id onto the merged theme and carry the light choice into its
 *  ATMOSPHERE param. */
const LEGACY_CAROUSEL_THEMES = new Map<string, MigratedCarouselTheme>([
  ["ascentDawn", { atmosphere: "dawn", id: "ascent" }],
  ["ascentDusk", { atmosphere: "dusk", id: "ascent" }],
  ["traceDawn", { atmosphere: "dawn", id: "trace" }],
  ["traceDusk", { atmosphere: "dusk", id: "trace" }],
]);

/** The persisted carousel selection, validated against the current theme set,
 *  with legacy Dawn/Dusk ids folded onto the merged themes. `null` = nothing
 *  usable persisted (keep the default). */
export const migrateCarouselTheme = (
  persisted: LoadedUi
): MigratedCarouselTheme | null => {
  const stored = persisted.carouselTheme;
  if (stored === undefined || stored === "") {
    return null;
  }
  if (isCarouselThemeId(stored)) {
    return { id: stored };
  }
  return LEGACY_CAROUSEL_THEMES.get(stored) ?? null;
};

/** The persisted theme configs, with any legacy single-key configs (pre-param-
 *  schema) folded in so existing users keep their tuned themes. Each value is
 *  coerced on read by `coerceConfig`, so raw migration is safe. */
export const migrateThemeConfigs = (
  persisted: LoadedUi,
  carousel: MigratedCarouselTheme | null
) => {
  const configs = { ...persisted.themeConfigs };
  if (
    persisted.altitudeConfig !== undefined &&
    configs.altitude === undefined
  ) {
    configs.altitude = persisted.altitudeConfig;
  }
  if (persisted.strataConfig !== undefined && configs.strata === undefined) {
    configs.strata = persisted.strataConfig;
  }
  if (
    carousel?.atmosphere !== undefined &&
    configs[carousel.id] === undefined
  ) {
    configs[carousel.id] = { atmosphere: carousel.atmosphere };
  }
  return configs;
};

/** The persisted colour choice, with legacy formats folded in: the pre-round-2
 *  `accent` hex becomes a preset choice; a Photo-theme user's PhotoMood (or its
 *  round-1 `themeConfigs.photo.palette` form) becomes a photo-derived choice. */
export const migrateColorChoice = (persisted: LoadedUi): ColorChoice | null => {
  if (persisted.colorChoice !== undefined) {
    return persisted.colorChoice;
  }
  if (persisted.theme === "photo") {
    const legacyMood = coerceColorChoice({
      kind: "photo",
      variant: persisted.themeConfigs?.photo?.palette ?? persisted.photoMood,
    });
    if (legacyMood) {
      return legacyMood;
    }
  }
  if (persisted.accent !== undefined) {
    return coerceColorChoice({
      kind: "preset",
      scheme: { primary: persisted.accent },
    });
  }
  return null;
};
