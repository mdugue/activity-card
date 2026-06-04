/**
 * Sport-aware stat model for carousel slides. Reuses the single-card stat
 * conventions (see the `sport-data` skill): rides think in speed + power, runs
 * in pace, swims in pace-per-100m and SWOLF. Returns ordered, formatted items so
 * every template draws from one source of truth, plus planners that distribute
 * those stats across a deck so no two slides repeat the same number.
 */

import type { ActivityData, Coord } from "@/components/app/sample-data";
import {
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import type { EffectiveStyle } from "./resolve";
import type { HeroMetric } from "./theme-tokens";
import type { Slide } from "./types";

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
  return buildStats(data, opts)[0] ?? distance(data);
}

/**
 * Assign stats to each slide of a standard deck so the intro headlines the hero
 * number, the detail slides page through the *rest* without repeating it, and
 * the wrap-up slide draws its own summary. Returns one StatItem[] per slide.
 *
 * Decks are always [hero, …detail, wrap-up]; detail slides carry capacity by
 * template (statRow 3, statGrid 4) and consume the remaining stats in order.
 */
export function planStandardStats(
  data: ActivityData,
  slides: Slide[],
  metric: HeroMetric,
  opts?: StatOpts
): StatItem[][] {
  const all = buildStats(data, opts);
  const hero = heroStat(data, metric, opts);
  const rest = all.filter((s) => s.key !== hero.key);
  let cursor = 0;
  const last = slides.length - 1;
  return slides.map((slide, i) => {
    if (i === 0) {
      return [hero];
    }
    if (i === last) {
      return [];
    }
    const cap = slide.template === "statRow" ? 3 : 4;
    const slice = rest.slice(cursor, cursor + cap);
    cursor += cap;
    return slice;
  });
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

/**
 * One entry point the seamless canvas calls to assign each slide its stats,
 * branching on the panel kind: standard decks distribute the rest of the stats
 * across detail slides; Frame shows one curated datum per slide; Press leads
 * with a lede then pages a pull-quote stat per spread.
 */
export function planSlideStats(
  data: ActivityData,
  slides: Slide[],
  style: EffectiveStyle,
  opts?: StatOpts
): StatItem[][] {
  const last = slides.length - 1;
  if (style.panelKind === "frame") {
    const fs = frameStats(data, opts);
    return slides.map((_, i) => {
      if (i === last) {
        return [];
      }
      const item = fs[i];
      return item ? [item] : [];
    });
  }
  if (style.panelKind === "press") {
    const all = buildStats(data, opts);
    const rest = all.slice(3);
    return slides.map((_, i) => {
      if (i === 0) {
        return all.slice(0, 3); // headline + lede
      }
      if (i === last) {
        return [];
      }
      // First spread leads with elevation (paired with the altitude cut); the
      // second carries the next datum + a couple more (e.g. power) as a row.
      return i === 1 ? rest.slice(0, 1) : rest.slice(1, 4);
    });
  }
  return planStandardStats(data, slides, style.heroMetric, opts);
}

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
