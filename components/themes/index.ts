import {
  ALTITUDE_MOODS as ALTITUDE_MOODS_SRC,
  ThemeAltitude,
} from "./altitude";
import { ThemeData } from "./data";
import { ThemeEditorial } from "./editorial";
import { ThemePath } from "./path";
import { ThemePhoto } from "./photo";
import { ThemeTriathlon } from "./triathlon";

export const THEMES = {
  path: ThemePath,
  altitude: ThemeAltitude,
  photo: ThemePhoto,
  data: ThemeData,
  editorial: ThemeEditorial,
  triathlon: ThemeTriathlon,
} as const;

export type ThemeId = keyof typeof THEMES;

export const ALTITUDE_MOODS = ALTITUDE_MOODS_SRC;
