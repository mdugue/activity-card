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

/** The value at quantile `q` (0…1) of a series. */
const quantile = (values: number[], q: number): number => {
  const sorted = values.toSorted((a, b) => a - b);
  const at = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(q * (sorted.length - 1)))
  );
  return sorted[at];
};

/** A light smoothing window: about 1% of the samples. */
const smoothingRadius = (n: number): number => Math.max(1, Math.round(n / 120));

/** The recorded speed along the route, lightly smoothed: km/h for a ride, or
 *  pace (sec/km) for a run or swim. Null when neither was recorded. */
const speedSeries = (
  data: ActivityView
): { kind: "pace" | "speed"; values: number[] } | null => {
  if (data.speedProfile && data.speedProfile.length > 1) {
    const v = data.speedProfile;
    return {
      kind: "speed",
      values: smoothSeries(v, smoothingRadius(v.length)),
    };
  }
  if (data.paceProfile && data.paceProfile.length > 1) {
    const v = data.paceProfile;
    return { kind: "pace", values: smoothSeries(v, smoothingRadius(v.length)) };
  }
  return null;
};

/** Ignore the slowest and fastest few percent (a stop at a light, a GPS
 *  spike), so the scale spans what the activity actually felt like. */
const SPEED_TAIL = 0.04;

/** Effort along the route, 0 = slowest … 1 = fastest: the speed profile, or
 *  the inverted pace profile, scaled between its 4th and 96th percentile.
 *  Null when neither was recorded. */
export const wovenIntensity = (data: ActivityView): number[] | null => {
  const series = speedSeries(data);
  if (!series) {
    return null;
  }
  const lo = quantile(series.values, SPEED_TAIL);
  const hi = quantile(series.values, 1 - SPEED_TAIL);
  const span = hi - lo || 1;
  return series.values.map((v) => {
    const t = Math.min(1, Math.max(0, (v - lo) / span));
    return series.kind === "pace" ? 1 - t : t;
  });
};

/** The slowest and fastest stretch of the activity, formatted for a legend:
 *  "6 – 54 km/h" for a ride, "6:10 – 4:20 /km" for a run. (The colour scale
 *  saturates a little inside these, see `wovenIntensity`.) */
export const wovenSpeedRange = (
  data: ActivityView
): { fast: string; slow: string; unit: string } | null => {
  const series = speedSeries(data);
  if (!series) {
    return null;
  }
  const lo = Math.min(...series.values);
  const hi = Math.max(...series.values);
  if (series.kind === "speed") {
    return { fast: formatNumber(hi), slow: formatNumber(lo), unit: "km/h" };
  }
  const unit = data.sport === "swim" ? "/100m" : "/km";
  // Pace: the slow end is the larger number.
  return { fast: formatPaceSec(lo), slow: formatPaceSec(hi), unit };
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

/** Resample a polyline to `n` points evenly spaced along its length. */
export const resampleRoute = (pts: Coord[], n: number): Coord[] => {
  if (pts.length < 2 || n < 2) {
    return pts;
  }
  const total = polylineLength(pts);
  if (total === 0) {
    return pts;
  }
  const out: Coord[] = [pts[0]];
  let seg = 1;
  let walked = 0;
  let segLen = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  for (let i = 1; i < n - 1; i += 1) {
    const at = (total * i) / (n - 1);
    while (walked + segLen < at && seg < pts.length - 1) {
      walked += segLen;
      seg += 1;
      segLen = Math.hypot(
        pts[seg][0] - pts[seg - 1][0],
        pts[seg][1] - pts[seg - 1][1]
      );
    }
    const t = segLen === 0 ? 0 : (at - walked) / segLen;
    const [ax, ay] = pts[seg - 1];
    const [bx, by] = pts[seg];
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  out.push(pts.at(-1) ?? pts[0]);
  return out;
};

/** A calmer copy of a route: evenly resampled to `n` points, then each point
 *  averaged with its ±`radius` neighbours. Hairpins open into curves — what
 *  text needs to stay legible along it. The ends stay put. */
export const smoothRoute = (
  pts: Coord[],
  n: number,
  radius: number
): Coord[] => {
  const even = resampleRoute(pts, n);
  const xs = smoothSeries(
    even.map((p) => p[0]),
    radius
  );
  const ys = smoothSeries(
    even.map((p) => p[1]),
    radius
  );
  return even.map((_, i): Coord => [xs[i], ys[i]]);
};

const f = (v: number): string => v.toFixed(1);

/** Corners of a regular polygon approximating a round join. Clockwise on
 *  screen, like every piece of `bandPath`. */
const JOIN_SIDES = 10;

/**
 * The outline of a polyline stroked `width` wide with round joins, as SVG path
 * data usable as a `clip-path: path(…)` (and a canvas `Path2D`): one quad per
 * segment plus a polygon per vertex, all wound the same way, so the nonzero
 * fill rule unions them. Lets a photo copy be clipped to the route itself.
 */
export const bandPath = (pts: Coord[], width: number): string => {
  if (pts.length === 0 || !(width > 0)) {
    return "";
  }
  const h = width / 2;
  const parts: string[] = [];
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (len > 0) {
      const nx = (-(by - ay) / len) * h;
      const ny = ((bx - ax) / len) * h;
      parts.push(
        `M${f(ax + nx)} ${f(ay + ny)}L${f(bx + nx)} ${f(by + ny)}L${f(bx - nx)} ${f(by - ny)}L${f(ax - nx)} ${f(ay - ny)}Z`
      );
    }
  }
  for (const [x, y] of pts) {
    const ring: string[] = [];
    for (let s = 0; s < JOIN_SIDES; s += 1) {
      // Decreasing angle = the same (negative) winding as the quads above.
      const a = (-2 * Math.PI * s) / JOIN_SIDES;
      ring.push(
        `${s === 0 ? "M" : "L"}${f(x + Math.cos(a) * h)} ${f(y + Math.sin(a) * h)}`
      );
    }
    parts.push(`${ring.join("")}Z`);
  }
  return parts.join("");
};
