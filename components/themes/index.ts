import type { ActivityData } from "@/components/app/sample-data";
import { availableVisibility, type Visibility } from "@/lib/visibility";
import { ThemeAltitude } from "./altitude";
import { ThemeData } from "./data";
import { ThemeEditorial } from "./editorial";
import { ThemeMinimal } from "./minimal";
import { ThemePath } from "./path";
import { ThemePhoto } from "./photo";
import { ThemeStrata } from "./strata";
import { ThemeTriathlon } from "./triathlon";

export const THEMES = {
  path: ThemePath,
  altitude: ThemeAltitude,
  photo: ThemePhoto,
  minimal: ThemeMinimal,
  data: ThemeData,
  editorial: ThemeEditorial,
  triathlon: ThemeTriathlon,
  strata: ThemeStrata,
} as const;

export type ThemeId = keyof typeof THEMES;

/**
 * `hero` — photo is the centrepiece (ThemePhoto).
 * `supports` — photo is a tasteful backdrop the theme can absorb when one is
 *   provided and the user hasn't opted out via the visibility flag.
 * `none` — theme is too dense for a backdrop; we hide the photo upload control.
 */
export type PhotoMode = "hero" | "supports" | "none";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  /**
   * Whether an uploaded photo shows by default when this theme is selected.
   * Only meaningful for `photoMode: "supports"` (hero themes always show it;
   * `none` never does). STRATA and the dense Data/Triathlon themes opt in but
   * default OFF so their designed look shows first.
   */
  photoBackdropDefaultOn: boolean;
  photoMode: PhotoMode;
  tagline: string;
  usesAthleteName: boolean;
  usesHeartRate: boolean;
  usesLocation: boolean;
  usesSplits: boolean;
}

export const THEME_META: Record<ThemeId, ThemeMeta> = {
  path: {
    id: "path",
    label: "PATH",
    tagline: "route is the hero",
    photoMode: "supports",
    photoBackdropDefaultOn: true,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: false,
  },
  altitude: {
    id: "altitude",
    label: "ALTITUDE",
    tagline: "elevation as headline",
    photoMode: "hero",
    photoBackdropDefaultOn: true,
    usesAthleteName: false,
    usesLocation: true,
    usesHeartRate: true,
    usesSplits: false,
  },
  photo: {
    id: "photo",
    label: "PHOTO",
    tagline: "magazine cover",
    photoMode: "hero",
    photoBackdropDefaultOn: true,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: false,
  },
  minimal: {
    id: "minimal",
    label: "MINIMAL",
    tagline: "photo, pure",
    photoMode: "hero",
    photoBackdropDefaultOn: true,
    usesAthleteName: false,
    usesLocation: false,
    usesHeartRate: false,
    usesSplits: false,
  },
  data: {
    id: "data",
    label: "DATA",
    tagline: "dashboard poster",
    photoMode: "supports",
    photoBackdropDefaultOn: false,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: true,
    usesSplits: true,
  },
  editorial: {
    id: "editorial",
    label: "EDITORIAL",
    tagline: "typography led",
    photoMode: "supports",
    photoBackdropDefaultOn: true,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: true,
    usesSplits: false,
  },
  triathlon: {
    id: "triathlon",
    label: "TRIATHLON",
    tagline: "multi-sport",
    photoMode: "supports",
    photoBackdropDefaultOn: false,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: true,
  },
  strata: {
    id: "strata",
    label: "STRATA",
    tagline: "woven topography",
    photoMode: "supports",
    photoBackdropDefaultOn: false,
    usesAthleteName: false,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: false,
  },
};

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

/**
 * Which visibility switches apply for a single-card theme + activity: a field is
 * toggleable only when the activity has the data AND the chosen theme actually
 * renders it (athlete name / location / heart rate / splits are theme-gated).
 * Mirrors `carouselVisibilityAvailable` so both editors disable controls that
 * would do nothing, and computes `availableVisibility` once.
 */
export function themeVisibilityAvailable(
  data: ActivityData,
  theme: ThemeId
): Record<keyof Visibility, boolean> {
  const base = availableVisibility(data);
  const meta = THEME_META[theme];
  return {
    ...base,
    athleteName: base.athleteName && meta.usesAthleteName,
    location: base.location && meta.usesLocation,
    heartRate: base.heartRate && meta.usesHeartRate,
    splits: base.splits && meta.usesSplits,
  };
}
