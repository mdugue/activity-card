import {
  ALTITUDE_MOODS as ALTITUDE_MOODS_SRC,
  ThemeAltitude,
} from "./altitude";
import { ThemeData } from "./data";
import { ThemeEditorial } from "./editorial";
import { ThemeMinimal } from "./minimal";
import { ThemePath } from "./path";
import { ThemePhoto } from "./photo";
import { ThemeTriathlon } from "./triathlon";

export const THEMES = {
  path: ThemePath,
  altitude: ThemeAltitude,
  photo: ThemePhoto,
  minimal: ThemeMinimal,
  data: ThemeData,
  editorial: ThemeEditorial,
  triathlon: ThemeTriathlon,
} as const;

export type ThemeId = keyof typeof THEMES;

export const ALTITUDE_MOODS = ALTITUDE_MOODS_SRC;

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
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: false,
  },
  altitude: {
    id: "altitude",
    label: "ALTITUDE",
    tagline: "profile portrait",
    photoMode: "supports",
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
    usesAthleteName: false,
    usesLocation: false,
    usesHeartRate: false,
    usesSplits: false,
  },
  data: {
    id: "data",
    label: "DATA",
    tagline: "dashboard poster",
    photoMode: "none",
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
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: true,
    usesSplits: false,
  },
  triathlon: {
    id: "triathlon",
    label: "TRIATHLON",
    tagline: "multi-sport",
    photoMode: "none",
    usesAthleteName: true,
    usesLocation: true,
    usesHeartRate: false,
    usesSplits: true,
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
];
