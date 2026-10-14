/**
 * Where a theme's graphic sits on the canvas, as three ordinary config params
 * (`artX`, `artY`, `artScale`) — so the placement persists, resets and exports
 * with the rest of the theme's config, and the sliders and the on-card drag
 * edit one value. A theme that declares `ART_PARAMS` gets the drag/pinch
 * "Graphic" mode in the editor's Adjust overlay; it applies the placement
 * itself with `placePoints` (numerically, so clip paths move with it).
 *
 * Units: `artX` / `artY` in % of the canvas width / height, `artScale` in %.
 */

import type { Coord } from "@/lib/activity";
import type {
  ParamDef,
  ParamValue,
  ThemeConfig,
} from "@/theme/core/params/kinds";

export interface ArtConfig extends ThemeConfig {
  artScale: number;
  artX: number;
  artY: number;
}

/** The placement as factors: `scale` 1 = as designed, `x` / `y` in canvas px. */
export interface ArtPlacement {
  scale: number;
  x: number;
  y: number;
}

export const DEFAULT_ART_CONFIG: ArtConfig = {
  artScale: 100,
  artX: 0,
  artY: 0,
};

export const ART_SCALE_MIN = 40;
export const ART_SCALE_MAX = 220;
/** How far the graphic may move off centre, in % of the canvas. */
export const ART_SHIFT_MAX = 50;

export const ART_PARAMS: ParamDef[] = [
  {
    default: DEFAULT_ART_CONFIG.artScale,
    group: "layout",
    id: "artScale",
    kind: "slider",
    label: "GRAPHIC SIZE",
    max: ART_SCALE_MAX,
    min: ART_SCALE_MIN,
    step: 1,
    unit: "%",
  },
  {
    default: DEFAULT_ART_CONFIG.artX,
    group: "layout",
    id: "artX",
    kind: "slider",
    label: "GRAPHIC ↔",
    max: ART_SHIFT_MAX,
    min: -ART_SHIFT_MAX,
    step: 1,
    unit: "%",
  },
  {
    default: DEFAULT_ART_CONFIG.artY,
    group: "layout",
    id: "artY",
    kind: "slider",
    label: "GRAPHIC ↕",
    max: ART_SHIFT_MAX,
    min: -ART_SHIFT_MAX,
    step: 1,
    unit: "%",
  },
];

/** Whether a theme's params let its graphic be moved on the card. */
export const hasArtPlacement = (params: ParamDef[]): boolean =>
  ART_PARAMS.every((art) => params.some((p) => p.id === art.id));

/** A coerced config's slider value (the default for a theme without it). */
const num = (v: ParamValue | undefined, fallback: number): number => {
  const n = Number(v ?? fallback);
  return Number.isFinite(n) ? n : fallback;
};

/** The placement in canvas px for a `w`×`h` canvas. */
export const artPlacement = (
  config: ThemeConfig,
  w: number,
  h: number
): ArtPlacement => ({
  scale: num(config.artScale, DEFAULT_ART_CONFIG.artScale) / 100,
  x: (num(config.artX, 0) / 100) * w,
  y: (num(config.artY, 0) / 100) * h,
});

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** The config keys for a placement given in canvas px — clamped to the
 *  params' ranges and rounded to what the sliders show. */
export const artConfigFrom = (
  place: ArtPlacement,
  w: number,
  h: number
): ArtConfig => ({
  artScale: Math.round(clamp(place.scale * 100, ART_SCALE_MIN, ART_SCALE_MAX)),
  artX:
    Math.round(clamp((place.x / w) * 100, -ART_SHIFT_MAX, ART_SHIFT_MAX) * 10) /
    10,
  artY:
    Math.round(clamp((place.y / h) * 100, -ART_SHIFT_MAX, ART_SHIFT_MAX) * 10) /
    10,
});

/** Clamp a placement (canvas px) to the params' ranges, unrounded — for the
 *  live drag, so the gesture never fights the rounding. */
export const clampArtPlacement = (
  place: ArtPlacement,
  w: number,
  h: number
): ArtPlacement => ({
  scale: clamp(place.scale, ART_SCALE_MIN / 100, ART_SCALE_MAX / 100),
  x: clamp(place.x, (-ART_SHIFT_MAX / 100) * w, (ART_SHIFT_MAX / 100) * w),
  y: clamp(place.y, (-ART_SHIFT_MAX / 100) * h, (ART_SHIFT_MAX / 100) * h),
});

/** Move points by a placement: scaled about `origin` (the graphic's own
 *  centre), then shifted. */
export const placePoints = (
  pts: Coord[],
  place: ArtPlacement,
  origin: Coord
): Coord[] => {
  const [ox, oy] = origin;
  return pts.map(([x, y]): Coord => [
    ox + (x - ox) * place.scale + place.x,
    oy + (y - oy) * place.scale + place.y,
  ]);
};

/** The centre of the points' bounding box (`fallback` when empty). */
export const boundsCentre = (pts: Coord[], fallback: Coord): Coord => {
  if (pts.length === 0) {
    return fallback;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};
