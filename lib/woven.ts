/**
 * The "woven" theme family — Ridge, Light Trail, Window, Contour, Word Path and
 * Slices. Each one weaves a piece of the activity (route, elevation profile,
 * speed) INTO the background photo instead of stacking a stat block on top.
 *
 * This module is the family's shared, JSX-free model: the one METRICS knob every
 * woven theme carries (how loudly the numbers speak), the per-sport stat pick,
 * and the geometry the themes draw from (a single route / profile / speed
 * series, also for multi-activity projects). Pure, so it is unit-tested.
 */

import type { Coord } from "@/lib/activity";
import { projectRoute, sequenceProfiles } from "@/lib/chart-helpers";
import {
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
  isNum,
} from "@/lib/format";
import { segmentProfiles, segmentRoutes } from "@/lib/multi-activity";
import type { ParamDef, ThemeConfig } from "@/theme/core/params/kinds";
import type { ActivityView } from "@/theme/core/theme-contract";

// ---------------------------------------------------------------------------
// The METRICS knob
// ---------------------------------------------------------------------------

/** What the user picks. `auto` resolves against the export format. */
export type MetricsMode = "auto" | "off" | "subtle" | "full";

/** What a theme renders. */
export type MetricsLevel = "off" | "subtle" | "full";

export interface WovenConfig extends ThemeConfig {
  metrics: MetricsMode;
}

export const DEFAULT_WOVEN_CONFIG: WovenConfig = { metrics: "auto" };

/** The Strava export format: Strava already lists every number under the
 *  photo, so `auto` drops them there. */
const STRAVA_FORMAT_ID = "strava";

export const METRICS_PARAM: ParamDef = {
  default: DEFAULT_WOVEN_CONFIG.metrics,
  group: "stats",
  id: "metrics",
  kind: "segmented",
  label: "METRICS",
  options: [
    { blurb: "off for Strava", id: "auto", label: "AUTO" },
    { blurb: "image only", id: "off", label: "OFF" },
    { blurb: "one quiet line", id: "subtle", label: "SUBTLE" },
    { blurb: "labelled values", id: "full", label: "FULL" },
  ],
};

export const WOVEN_PARAMS: ParamDef[] = [METRICS_PARAM];

/** Resolve the picked mode for the active export format. */
export const metricsLevel = (
  mode: MetricsMode,
  formatId: string
): MetricsLevel => {
  if (mode !== "auto") {
    return mode;
  }
  return formatId === STRAVA_FORMAT_ID ? "off" : "subtle";
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface WovenStat {
  label: string;
  unit: string;
  value: string;
}

const distanceStat = (data: ActivityView): WovenStat =>
  data.sport === "swim"
    ? {
        label: "DISTANCE",
        unit: "m",
        value: formatNumber(data.distanceKm * 1000),
      }
    : {
        label: "DISTANCE",
        unit: "km",
        value: formatNumber(data.distanceKm, 1),
      };

/** The sport's third number: climbing for a ride, pace for a run or swim. */
const thirdStat = (data: ActivityView): WovenStat | null => {
  if (data.sport === "run" && isNum(data.avgPaceMinPerKm)) {
    return {
      label: "PACE",
      unit: "/km",
      value: formatPaceMin(data.avgPaceMinPerKm),
    };
  }
  if (data.sport === "swim" && isNum(data.avgPacePer100m)) {
    return {
      label: "PACE",
      unit: "/100m",
      value: formatPaceSec(data.avgPacePer100m),
    };
  }
  if (isNum(data.elevationGainM)) {
    return {
      label: "CLIMB",
      unit: "m",
      value: formatNumber(data.elevationGainM),
    };
  }
  if (isNum(data.avgSpeedKmh)) {
    return {
      label: "SPEED",
      unit: "km/h",
      value: formatNumber(data.avgSpeedKmh, 1),
    };
  }
  return null;
};

/** Distance, time and the sport's third number — never more. */
export const wovenStats = (data: ActivityView): WovenStat[] => {
  const out: WovenStat[] = [
    distanceStat(data),
    { label: "TIME", unit: "", value: formatDuration(data.durationSec) },
  ];
  const third = thirdStat(data);
  if (third) {
    out.push(third);
  }
  return out;
};

/** The same stats as one line: "87.3 KM · 3H 42M · 1240 M". */
export const statLine = (stats: WovenStat[]): string =>
  stats
    .map((s) => (s.unit === "" ? s.value : `${s.value} ${s.unit}`))
    .join(" · ")
    .toUpperCase();

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** A moving average over ±`radius` samples (edges use the samples they have). */
export const smoothSeries = (values: number[], radius: number): number[] =>
  values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j += 1) {
      if (j >= 0 && j < values.length) {
        sum += values[j];
        count += 1;
      }
    }
    return sum / count;
  });

const normalise = (values: number[]): number[] => {
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return values.map((v) => (v - min) / span);
};

/** The activity's one route: the top-level track, or every leg of a
 *  multi-activity project joined in order (one shared projection keeps the
 *  legs in their true places). Null when there is nothing to draw. */
export const wovenRoute = (data: ActivityView): Coord[] | null => {
  if (data.routeCoordinates && data.routeCoordinates.length > 1) {
    return data.routeCoordinates;
  }
  const legs = segmentRoutes(data).flatMap((r) => r.coords);
  return legs.length > 1 ? legs : null;
};

/** Project the route into a w×h box (uniform scale, centred). */
export const wovenRoutePoints = (
  data: ActivityView,
  w: number,
  h: number,
  pad = 0
): Coord[] => projectRoute(wovenRoute(data) ?? undefined, w, h, pad).points;

/** A profile on the unit square: x = share of the distance, y = 0 lowest … 1
 *  highest. Multi-activity legs are laid end to end, each as wide as its share
 *  of the distance. */
export interface WovenProfile {
  /** highest raw sample (metres for elevation) */
  max: number;
  /** lowest raw sample */
  min: number;
  pts: Coord[];
  /** `false` when a multi-activity project only had pace to offer */
  useElevation: boolean;
}

export const wovenProfile = (data: ActivityView): WovenProfile | null => {
  const raw = data.elevationProfile;
  if (raw && raw.length > 1) {
    const ys = normalise(raw);
    return {
      max: Math.max(...raw),
      min: Math.min(...raw),
      pts: ys.map((y, i) => [i / (ys.length - 1), y]),
      useElevation: true,
    };
  }
  const legs = segmentProfiles(data);
  const curves = sequenceProfiles(
    legs.profiles,
    legs.distances,
    legs.useElevation
  );
  const pts = curves.flatMap((c) => c.pts);
  if (pts.length < 2) {
    return null;
  }
  const all = legs.profiles.flat();
  return {
    max: Math.max(...all),
    min: Math.min(...all),
    pts,
    useElevation: legs.useElevation,
  };
};

/** Resample a profile to `n` evenly spaced heights (linear interpolation). */
export const sampleProfile = (pts: Coord[], n: number): number[] => {
  if (pts.length === 0 || n <= 0) {
    return [];
  }
  const out: number[] = [];
  let k = 0;
  for (let i = 0; i < n; i += 1) {
    const x = n === 1 ? 0 : i / (n - 1);
    while (k < pts.length - 2 && pts[k + 1][0] < x) {
      k += 1;
    }
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[Math.min(k + 1, pts.length - 1)];
    const t = x1 === x0 ? 0 : Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
    out.push(y0 + (y1 - y0) * t);
  }
  return out;
};

/** Effort along the route, 0 = slowest … 1 = fastest: the speed profile, or
 *  the inverted pace profile. Null when neither was recorded. */
export const wovenIntensity = (data: ActivityView): number[] | null => {
  if (data.speedProfile && data.speedProfile.length > 1) {
    return normalise(data.speedProfile);
  }
  if (data.paceProfile && data.paceProfile.length > 1) {
    return normalise(data.paceProfile).map((v) => 1 - v);
  }
  return null;
};

/** Total length of a polyline. */
export const polylineLength = (pts: Coord[]): number => {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
};

/** Polyline → SVG path data. */
export const toPath = (pts: Coord[], close = false): string => {
  const d = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`
    )
    .join(" ");
  return close && d !== "" ? `${d} Z` : d;
};

/** Break a title into at most two balanced lines for SVG text (which cannot
 *  wrap). Titles up to `maxChars` stay on one line. */
export const splitTitle = (title: string, maxChars: number): string[] => {
  const trimmed = title.trim();
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }
  const words = trimmed.split(/\s+/u);
  let best = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    const diff = Math.abs(a - b);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return words.length < 2
    ? [trimmed]
    : [words.slice(0, best).join(" "), words.slice(best).join(" ")];
};

/** Round-number distance marks along an activity: about `count` of them,
 *  excluding 0 and the finish. */
export const distanceMarks = (distanceKm: number, count: number): number[] => {
  if (!(distanceKm > 0) || count <= 0) {
    return [];
  }
  const raw = distanceKm / (count + 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ??
    10 * magnitude;
  const out: number[] = [];
  for (let km = step; km < distanceKm - step * 0.25; km += step) {
    out.push(Number(km.toFixed(6)));
  }
  return out;
};
