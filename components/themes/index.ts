import type { ActivityData } from "@/lib/activity";
import { availableVisibility, type Visibility } from "@/lib/visibility";
import { ThemeAltitude } from "./single-card/altitude";
import { ThemeData } from "./single-card/data";
import { ThemeEditorial } from "./single-card/editorial";
import { ThemeMinimal } from "./single-card/minimal";
import { ThemePath } from "./single-card/path";
import { ThemePhoto } from "./single-card/photo";
import { ThemeStrata } from "./single-card/strata";
import { ThemeTriathlon } from "./single-card/triathlon";

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

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  /**
   * Whether an uploaded photo shows by default when this theme is selected.
   * Every theme can render a background photo (adjustable via the same filter /
   * grain / mirror presets as the carousel); this only sets the initial state of
   * the `photoBackdrop` toggle. Photo-led themes default ON; the dense / designed
   * themes (Data, Triathlon, STRATA) default OFF so their look shows first.
   */
  photoDefaultOn: boolean;
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
    photoDefaultOn: true,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: false,
  },
  altitude: {
    id: "altitude",
    label: "ALTITUDE",
    tagline: "elevation as headline",
    photoDefaultOn: true,
    usesAthleteName: false,
    usesLocation: true,
    usesHeartRate: true,
    usesSplits: false,
  },
  photo: {
    id: "photo",
    label: "PHOTO",
    tagline: "magazine cover",
    photoDefaultOn: true,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: false,
  },
  minimal: {
    id: "minimal",
    label: "MINIMAL",
    tagline: "photo, pure",
    photoDefaultOn: true,
    usesAthleteName: false,
    usesLocation: false,
    usesHeartRate: false,
    usesSplits: false,
  },
  data: {
    id: "data",
    label: "DATA",
    tagline: "dashboard poster",
    photoDefaultOn: false,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: true,
    usesSplits: true,
  },
  editorial: {
    id: "editorial",
    label: "EDITORIAL",
    tagline: "typography led",
    photoDefaultOn: true,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: true,
    usesSplits: false,
  },
  triathlon: {
    id: "triathlon",
    label: "TRIATHLON",
    tagline: "multi-sport",
    photoDefaultOn: false,
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: true,
  },
  strata: {
    id: "strata",
    label: "STRATA",
    tagline: "woven topography",
    photoDefaultOn: false,
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
