/**
 * Sport-aware stat model for carousel slides. Reuses the single-card stat
 * conventions (see the `sport-data` skill): rides think in speed + power, runs
 * in pace, swims in pace-per-100m and SWOLF. Returns ordered, formatted items so
 * every panel draws from one source of truth. Each panel derives the stats it
 * shows directly from `data` (by its own slide index) — there is no deck-wide
 * stat planner.
 */

import type { ActivityData, Coord } from "@/lib/activity";
import {
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import type { HeroMetric } from "./theme-tokens";

export interface StatItem {
  /** stable identifier, used for visibility toggles + sparkline mapping */
  key: string;
  label: string;
  /** unit suffix (e.g. "km", "/km", "bpm"); empty for unitless */
  unit: string;
  /** formatted magnitude, no unit (e.g. "87.3") */
  value: string;
}

function distance(data: ActivityData): StatItem {
  if (data.sport === "swim") {
    return {
      key: "distance",
      label: "DISTANCE",
      value: formatNumber(data.distanceKm * 1000, 0),
      unit: "m",
    };
  }
  return {
    key: "distance",
    label: "DISTANCE",
    value: formatNumber(data.distanceKm, 1),
    unit: "km",
  };
}

function duration(data: ActivityData): StatItem {
  return {
    key: "duration",
    label: "TIME",
    value: formatDuration(data.durationSec),
    unit: "",
  };
}

function elevation(data: ActivityData): StatItem | null {
  return data.elevationGainM === undefined ||
    !Number.isFinite(data.elevationGainM)
    ? null
    : {
        key: "elevation",
        label: "ELEVATION",
        value: formatNumber(data.elevationGainM, 0),
        unit: "m",
      };
}

/** Distance and time are the irreducible core of a card, so they're never
 *  stripped from the data; the carousel honours their visibility here instead. */
export interface StatOpts {
  distance?: boolean;
  time?: boolean;
}

/** Build the full ordered set of stats available for this activity. Items
 *  with no underlying data are omitted so templates never render a dash. The
 *  order is the storyboard priority — distance always leads. */
export function buildStats(data: ActivityData, opts?: StatOpts): StatItem[] {
  const items: StatItem[] = [];
  if (opts?.distance ?? true) {
    items.push(distance(data));
  }
  const dur = (opts?.time ?? true) ? duration(data) : null;
  const push = (item: StatItem | null) => {
    if (item) {
      items.push(item);
    }
  };
  const num = (
    key: string,
    label: string,
    n: number | undefined,
    unit: string,
    digits = 0
  ): StatItem | null =>
    n === undefined || !Number.isFinite(n)
      ? null
      : { key, label, value: formatNumber(n, digits), unit };

  if (data.sport === "ride") {
    push(dur);
    push(num("avgSpeed", "AVG SPEED", data.avgSpeedKmh, "km/h", 1));
    push(elevation(data));
    push(num("power", "POWER", data.normalizedPowerW, "W"));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
    push(num("cadence", "CADENCE", data.avgCadence, "rpm"));
    push(num("maxSpeed", "MAX SPEED", data.maxSpeedKmh, "km/h", 1));
    push(num("vam", "VAM", data.vamMph, "m/h"));
  } else if (data.sport === "run") {
    push(
      data.avgPaceMinPerKm
        ? {
            key: "pace",
            label: "AVG PACE",
            value: formatPaceMin(data.avgPaceMinPerKm),
            unit: "/km",
          }
        : null
    );
    push(dur);
    push(elevation(data));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
    push(num("cadence", "CADENCE", data.avgCadence, "spm"));
  } else if (data.sport === "swim") {
    push(
      data.avgPacePer100m
        ? {
            key: "pace",
            label: "PACE",
            value: formatPaceSec(data.avgPacePer100m),
            unit: "/100m",
          }
        : null
    );
    push(dur);
    push(num("swolf", "SWOLF", data.swolf, ""));
    push(num("stroke", "STROKES", data.strokeCountAvg, "/lap"));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
  } else {
    // triathlon — overall summary; per-segment detail is a future theme.
    push(dur);
    push(elevation(data));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
  }

  return items;
}

/** The single most expressive stat for a Hero slide. Distance for most themes;
 *  total elevation when the theme headlines the climb (Ascent). Falls back to
 *  distance if the requested metric has no data. */
/** A blank headline used when every stat (including distance + time) is hidden,
 *  so the hero slide shows the title alone instead of resurrecting a hidden
 *  number. */
const EMPTY_HERO: StatItem = { key: "", label: "", value: "", unit: "" };

export function heroStat(
  data: ActivityData,
  metric: HeroMetric = "distance",
  opts?: StatOpts
): StatItem {
  if (metric === "elevation") {
    const el = elevation(data);
    if (el) {
      return el;
    }
  }
  // Falls back through the ordered set when the headline metric is hidden.
  // buildStats already honours the distance/time toggles, so when the user has
  // hidden Distance *and* Time (and nothing else remains) it is empty — return a
  // blank hero rather than re-injecting the distance the user just turned off.
  return buildStats(data, opts)[0] ?? EMPTY_HERO;
}

/** The distance/time visibility a stat panel honours, read from the deck-wide
 *  visibility flags it already receives. */
export function statOptsFor(vis: {
  distance: boolean;
  time: boolean;
}): StatOpts {
  return { distance: vis.distance, time: vis.time };
}

/** A standard stat detail slide shows every stat EXCEPT the one the hero slide
 *  headlines (so the deck doesn't repeat its big number). */
export function detailStats(
  data: ActivityData,
  metric: HeroMetric,
  opts?: StatOpts
): StatItem[] {
  const heroKey = heroStat(data, metric, opts).key;
  return buildStats(data, opts).filter((s) => s.key !== heroKey);
}

/** The stats a Press slide shows, by position: the front page leads with the
 *  headline + lede (first 3); the first spread carries one pull-quote, the next
 *  a small row; the byline shows none. */
export function pressSlideStats(
  data: ActivityData,
  index: number,
  total: number,
  opts?: StatOpts
): StatItem[] {
  if (index === 0) {
    return buildStats(data, opts).slice(0, 3); // headline + lede
  }
  if (index === total - 1) {
    return [];
  }
  const rest = buildStats(data, opts).slice(3);
  // First spread leads with one pull-quote; later spreads carry a small row.
  return index === 1 ? rest.slice(0, 1) : rest.slice(1, 4);
}

/**
 * Curated, sport-aware order for the Frame theme (one datum per slide). Leads
 * with the metrics that have an expressive sparkline (route, elevation, power,
 * speed) so each slide pairs a number with a graphic.
 */
const FRAME_PRIORITY: Record<ActivityData["sport"], string[]> = {
  ride: ["distance", "elevation", "power", "avgSpeed", "duration", "avgHr"],
  run: ["distance", "pace", "elevation", "duration", "avgHr", "cadence"],
  swim: ["distance", "pace", "swolf", "duration", "avgHr"],
  triathlon: ["distance", "duration", "elevation", "avgHr"],
};

export function frameStats(data: ActivityData, opts?: StatOpts): StatItem[] {
  const all = buildStats(data, opts);
  const byKey = new Map(all.map((s) => [s.key, s]));
  const order = FRAME_PRIORITY[data.sport];
  const ordered: StatItem[] = [];
  for (const key of order) {
    const item = byKey.get(key);
    if (item) {
      ordered.push(item);
    }
  }
  const seen = new Set(order);
  for (const s of all) {
    if (!seen.has(s.key)) {
      ordered.push(s);
    }
  }
  return ordered;
}

/* ---- sparkline series (Frame) ---- */

export function routeSeries(data: ActivityData): Coord[] | undefined {
  const c = data.routeCoordinates;
  return c && c.length > 1 ? c : undefined;
}

export function elevationSeries(data: ActivityData): number[] | undefined {
  const p = data.elevationProfile;
  return p && p.length > 1 ? p : undefined;
}

export function speedSeries(data: ActivityData): number[] | undefined {
  if (data.speedProfile && data.speedProfile.length > 1) {
    return data.speedProfile;
  }
  // Real uploads have no speed stream, but per-split avg speed makes a fair
  // coarse curve.
  const fromSplits = (data.splits ?? [])
    .map((s) => s.avgSpeedKmh)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));
  return fromSplits.length > 1 ? fromSplits : undefined;
}

export function powerSeries(data: ActivityData): number[] | undefined {
  const p = data.powerProfile;
  return p && p.length > 1 ? p : undefined;
}

export function paceSeries(data: ActivityData): number[] | undefined {
  const p = data.paceProfile;
  return p && p.length > 1 ? p : undefined;
}
