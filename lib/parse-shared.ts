/**
 * Format-agnostic parser internals shared by `parse-gpx.ts` and
 * `parse-fit.ts`. Kept in its own module so the two parser chunks can
 * deduplicate via a single shared chunk; nothing in this file depends on
 * `fast-xml-parser`, `fit-file-parser`, or zod, so both parsers can be
 * dynamic-imported independently without dragging the other's deps along.
 */

import type { Coord, Split, StravaPhotoRef } from "@/lib/activity";
import { CALENDAR_DATE_RE } from "@/lib/format";
import { resampleTo, simplifyToCount, smooth } from "@/lib/simplify";

export type ParsedSport = "ride" | "run" | "swim" | "triathlon";

export interface ParsedActivity {
  athleteName: string;
  avgCadence?: number;
  avgHeartRate?: number;
  avgPaceMinPerKm?: number;
  avgPacePer100m?: number;

  avgSpeedKmh?: number;
  date: string;

  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;
  elevationProfile?: number[];
  endTimeMs?: number;
  location: string;
  maxSpeedKmh?: number;
  paceProfile?: number[];

  routeCoordinates?: Coord[];
  splits?: Split[];
  sport: ParsedSport;

  startTimeMs?: number;
  /** Strava activity ids for "View on Strava" linking. Single Strava
   * activity → `[id]`. Combined triathlon → segment-aligned with `null`
   * entries for file-sourced parts. Unset for pure GPX/.fit uploads. */
  stravaActivityIds?: (number | null)[];
  /** Photos Strava attached to the activity (set by the detail route,
   * never by the file parsers). */
  stravaPhotos?: StravaPhotoRef[];
  title: string;
}

export interface TrackPoint {
  cadence?: number;
  elevation?: number;
  heartRate?: number;
  lat?: number;
  lng?: number;
  time?: number;
}

const ROUTE_TARGET_POINTS = 150;
const ELEVATION_TARGET_POINTS = 80;
const PACE_TARGET_POINTS = 80;
const PACE_SMOOTH_WINDOW = 7;

export interface FinaliseInput {
  isoDate?: string | number | Date;
  name: string;
  points: TrackPoint[];
  sessionAvgCadence?: number;
  sessionAvgHr?: number;
  sessionAvgSpeedKmh?: number;
  sessionDistanceKm?: number;
  sessionDurationSec?: number;
  sessionElevationM?: number;
  sessionMaxSpeedKmh?: number;
  sport: ParsedSport;
}

export const round = (n: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** Truthiness of an optional reading: `undefined`, `0` and `NaN` all mean
 * "not recorded". */
const isRecorded = (n: number | undefined): n is number =>
  n !== undefined && n !== 0 && !Number.isNaN(n);

const sportSpecificStats = (
  sport: ParsedSport,
  avgSpeedKmh: number | undefined,
  maxSpeedKmh: number | undefined
): Pick<
  ParsedActivity,
  "avgSpeedKmh" | "maxSpeedKmh" | "avgPaceMinPerKm" | "avgPacePer100m"
> => {
  if (sport === "ride") {
    return {
      avgSpeedKmh: isRecorded(avgSpeedKmh) ? round(avgSpeedKmh, 1) : undefined,
      maxSpeedKmh: isRecorded(maxSpeedKmh) ? round(maxSpeedKmh, 1) : undefined,
    };
  }
  if (sport === "run" && avgSpeedKmh !== undefined && avgSpeedKmh > 0) {
    return { avgPaceMinPerKm: 60 / avgSpeedKmh };
  }
  if (sport === "swim" && avgSpeedKmh !== undefined && avgSpeedKmh > 0) {
    return { avgPacePer100m: Math.round(360 / avgSpeedKmh) };
  }
  return {};
};

const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const cumulativeDistanceKm = (points: TrackPoint[]): number => {
  let m = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (
      a.lat === undefined ||
      a.lng === undefined ||
      b.lat === undefined ||
      b.lng === undefined
    ) {
      continue;
    }
    m += haversineMeters(a.lat, a.lng, b.lat, b.lng);
  }
  return m / 1000;
};

const isNum = (x: number | undefined): x is number =>
  x !== undefined && Number.isFinite(x);

/** The finite values of one track-point channel, in order. */
const finiteSeries = (
  points: TrackPoint[],
  channel: keyof TrackPoint
): number[] => {
  const values: number[] = [];
  for (const p of points) {
    const value = p[channel];
    if (isNum(value)) {
      values.push(value);
    }
  }
  return values;
};

const totalDurationSec = (points: TrackPoint[]): number => {
  const times = finiteSeries(points, "time");
  const last = times.at(-1);
  if (times.length < 2 || last === undefined) {
    return 0;
  }
  return (last - times[0]) / 1000;
};

const cumulativeElevationGain = (points: TrackPoint[]): number => {
  let gain = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1].elevation;
    const b = points[i].elevation;
    if (a !== undefined && b !== undefined && b > a) {
      gain += b - a;
    }
  }
  return gain;
};

/**
 * Per-km splits via cumulative-distance crossings. Uses linear interpolation
 * of timestamps between the two points that straddle each km boundary.
 */
const derivePerKmSplits = (
  points: TrackPoint[],
  totalDistanceKm: number
): Split[] | undefined => {
  if (totalDistanceKm < 1.5) {
    return undefined;
  }
  const stamped: { time: number; cumM: number }[] = [];
  let cumM = 0;
  // Track the last *stamped* coords, not `points[i - 1]`: when the previous
  // raw point is missing lat/lng/time we'd otherwise skip the haversine and
  // undercount distance, pushing every following split boundary off.
  let lastLat: number | undefined;
  let lastLng: number | undefined;
  for (const p of points) {
    if (p.lat === undefined || p.lng === undefined || p.time === undefined) {
      continue;
    }
    if (lastLat !== undefined && lastLng !== undefined) {
      cumM += haversineMeters(lastLat, lastLng, p.lat, p.lng);
    }
    stamped.push({ cumM, time: p.time });
    lastLat = p.lat;
    lastLng = p.lng;
  }
  if (stamped.length < 2) {
    return undefined;
  }

  const splits: Split[] = [];
  let nextKm = 1;
  let prevTime = stamped[0].time;
  for (let i = 1; i < stamped.length; i += 1) {
    while (stamped[i].cumM >= nextKm * 1000) {
      const a = stamped[i - 1];
      const b = stamped[i];
      const span = b.cumM - a.cumM || 1;
      const f = (nextKm * 1000 - a.cumM) / span;
      const tBoundary = a.time + (b.time - a.time) * f;
      const durSec = Math.round((tBoundary - prevTime) / 1000);
      if (durSec > 0) {
        splits.push({ durationSec: durSec, km: nextKm });
      }
      prevTime = tBoundary;
      nextKm += 1;
    }
  }
  return splits.length ? splits : undefined;
};

/**
 * Smoothed pace profile (sec/km) for runs. Derived from rolling distance and
 * time deltas, then resampled to a fixed length so themes don't have to
 * re-bucket per render.
 */
const derivePaceProfile = (points: TrackPoint[]): number[] | undefined => {
  const stamped: { time: number; lat: number; lng: number }[] = [];
  for (const p of points) {
    if (p.lat !== undefined && p.lng !== undefined && p.time !== undefined) {
      stamped.push({ lat: p.lat, lng: p.lng, time: p.time });
    }
  }
  if (stamped.length < 4) {
    return undefined;
  }
  const paces: number[] = [];
  // Window in points — at typical 1Hz this is ~10s of running.
  const win = Math.max(4, Math.floor(stamped.length / 60));
  for (let i = win; i < stamped.length; i += 1) {
    const a = stamped[i - win];
    const b = stamped[i];
    const meters = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    const secs = (b.time - a.time) / 1000;
    if (meters > 1 && secs > 0) {
      const secPerKm = (secs * 1000) / meters;
      // Clamp absurd values (GPS jumps, stops at lights, …)
      if (secPerKm > 60 && secPerKm < 1800) {
        paces.push(secPerKm);
      }
    }
  }
  if (paces.length < 8) {
    return undefined;
  }
  const smoothed = smooth(paces, PACE_SMOOTH_WINDOW);
  return resampleTo(
    smoothed,
    Math.min(PACE_TARGET_POINTS, smoothed.length)
  ).map((v) => Math.round(v));
};

const mean = (xs: number[]): number | undefined => {
  if (xs.length === 0) {
    return undefined;
  }
  return xs.reduce((a, b) => a + b, 0) / xs.length;
};

const pad = (n: number): string => String(n).padStart(2, "0");

const localCalendarDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The activity's calendar date as `YYYY-MM-DD`. A bare calendar date passes
 * through unchanged; an instant (GPX/FIT timestamps) is read in the local
 * timezone — the athlete's device timezone is the best client-side proxy for
 * where the activity happened. Never the UTC day.
 */
const toIsoDate = (input?: string | number | Date): string => {
  // Only a string can be a bare calendar date: a number or Date never
  // stringifies to `YYYY-MM-DD`.
  const text = input === undefined ? "" : String(input);
  if (CALENDAR_DATE_RE.test(text)) {
    return text;
  }
  const d =
    input === undefined || input === "" || input === 0
      ? new Date()
      : new Date(input);
  return localCalendarDate(Number.isNaN(d.getTime()) ? new Date() : d);
};

const prettifyName = (name: string): string =>
  name
    .replaceAll(/[_-]+/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .replaceAll(/\b\w/gu, (c) => c.toUpperCase());

export const finalise = (input: FinaliseInput): ParsedActivity => {
  const { points, sport, name, isoDate } = input;

  const distanceKm = input.sessionDistanceKm ?? cumulativeDistanceKm(points);
  const durationSec = input.sessionDurationSec ?? totalDurationSec(points);

  const ptTimes = finiteSeries(points, "time");
  // Prefer the declared start time, but only if it parses to a finite epoch.
  // Malformed metadata (e.g. a `<time>` element with junk in it) would
  // otherwise propagate NaN through triathlon ordering and transition math.
  const startTimeMs = (() => {
    if (isoDate !== undefined) {
      const parsed = new Date(isoDate).getTime();
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return ptTimes[0];
  })();
  const endTimeMs = ptTimes.at(-1);

  const elevationGainM =
    input.sessionElevationM ?? cumulativeElevationGain(points);

  const avgHr = input.sessionAvgHr ?? mean(finiteSeries(points, "heartRate"));

  const avgCadence =
    input.sessionAvgCadence ?? mean(finiteSeries(points, "cadence"));

  const avgSpeedKmh =
    input.sessionAvgSpeedKmh ??
    (durationSec > 0 ? (distanceKm / durationSec) * 3600 : undefined);

  // route in (lng, -lat) so y grows downwards and `chart-helpers` can treat
  // it as plain Cartesian without flipping per call. RDP is run in this same
  // space — its tolerance is degrees, fine for visual simplification.
  const rawRoute = points.flatMap<Coord>((p) =>
    p.lat !== undefined && p.lng !== undefined ? [[p.lng, -p.lat]] : []
  );
  const routeCoordinates = rawRoute.length
    ? simplifyToCount(rawRoute, ROUTE_TARGET_POINTS)
    : undefined;

  const rawElevation = finiteSeries(points, "elevation");
  const elevationProfile = rawElevation.length
    ? resampleTo(
        rawElevation,
        Math.min(ELEVATION_TARGET_POINTS, rawElevation.length)
      ).map((v) => Math.round(v))
    : undefined;

  const splits =
    sport === "swim" ? undefined : derivePerKmSplits(points, distanceKm);

  const paceProfile = sport === "run" ? derivePaceProfile(points) : undefined;

  return {
    // The sport-specific keys never overlap the ones below.
    ...sportSpecificStats(sport, avgSpeedKmh, input.sessionMaxSpeedKmh),
    athleteName: "",
    avgCadence: isRecorded(avgCadence) ? Math.round(avgCadence) : undefined,
    avgHeartRate: isRecorded(avgHr) ? Math.round(avgHr) : undefined,
    date: toIsoDate(isoDate),
    distanceKm: round(distanceKm, 2),
    durationSec: durationSec > 0 ? Math.round(durationSec) : 0,
    elevationGainM: elevationGainM > 0 ? Math.round(elevationGainM) : undefined,
    elevationProfile,
    endTimeMs,
    location: "",
    paceProfile,
    routeCoordinates,
    splits,
    sport,
    startTimeMs,
    title: prettifyName(name),
  };
};

/**
 * Filename / activity-name hints, matched as whole words and checked in this
 * order (run → swim → ride → triathlon): the first hit wins.
 */
const NAME_SPORT_WORDS: readonly [ParsedSport, readonly string[]][] = [
  ["run", ["run", "running"]],
  ["swim", ["swim", "swimming"]],
  ["ride", ["ride", "bike", "cycling"]],
  ["triathlon", ["triathlon"]],
];

const sportFromDeclaredType = (s: string): ParsedSport | undefined => {
  if (s.includes("cycl") || s.includes("bike") || s.includes("ride")) {
    return "ride";
  }
  if (s.includes("run")) {
    return "run";
  }
  if (s.includes("swim")) {
    return "swim";
  }
  if (s.includes("triathlon") || s.includes("multisport")) {
    return "triathlon";
  }
  return undefined;
};

/**
 * Map a declared sport type (GPX `<type>`, FIT `sport`, Strava `sport_type`)
 * to our sport. The declared type always wins; the filename (for Strava, the
 * activity name) is only consulted when the type is missing or unrecognised,
 * and then by whole words so "brunch" is not a run and "strides" not a ride.
 * Defaults to ride.
 */
export const detectSport = (
  raw: string | undefined,
  filename: string
): ParsedSport => {
  const declared = sportFromDeclaredType((raw ?? "").toLowerCase());
  if (declared) {
    return declared;
  }
  // Split camelCase ("MorningRun") before lowercasing so it yields whole words.
  const words = new Set(
    filename
      .replaceAll(/[a-z][A-Z]/gu, (pair) => `${pair[0]} ${pair[1]}`)
      .toLowerCase()
      .split(/[^a-z]+/u)
  );
  for (const [sport, hints] of NAME_SPORT_WORDS) {
    if (hints.some((w) => words.has(w))) {
      return sport;
    }
  }
  return "ride";
};
