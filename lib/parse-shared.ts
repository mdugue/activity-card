/**
 * Format-agnostic parser internals shared by `parse-gpx.ts` and
 * `parse-fit.ts`. Kept in its own module so the two parser chunks can
 * deduplicate via a single shared chunk; nothing in this file depends on
 * `fast-xml-parser`, `fit-file-parser`, or zod, so both parsers can be
 * dynamic-imported independently without dragging the other's deps along.
 */

import type { Coord, Split, StravaPhotoRef } from "@/lib/activity";
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

export function finalise(input: FinaliseInput): ParsedActivity {
  const { points, sport, name, isoDate } = input;

  const distanceKm = input.sessionDistanceKm ?? cumulativeDistanceKm(points);
  const durationSec = input.sessionDurationSec ?? totalDurationSec(points);

  const ptTimes = points.map((p) => p.time).filter(isNum);
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

  const avgHr =
    input.sessionAvgHr ?? mean(points.map((p) => p.heartRate).filter(isNum));

  const avgCadence =
    input.sessionAvgCadence ?? mean(points.map((p) => p.cadence).filter(isNum));

  const avgSpeedKmh =
    input.sessionAvgSpeedKmh ??
    (durationSec > 0 ? (distanceKm / durationSec) * 3600 : undefined);

  // route in (lng, -lat) so y grows downwards and `chart-helpers` can treat
  // it as plain Cartesian without flipping per call. RDP is run in this same
  // space — its tolerance is degrees, fine for visual simplification.
  const rawRoute: Coord[] = points
    .filter((p) => p.lat !== undefined && p.lng !== undefined)
    .map((p) => [p.lng as number, -(p.lat as number)] as Coord);
  const routeCoordinates = rawRoute.length
    ? simplifyToCount(rawRoute, ROUTE_TARGET_POINTS)
    : undefined;

  const rawElevation = points.map((p) => p.elevation).filter(isNum);
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
    sport,
    title: prettifyName(name),
    date: toIsoDate(isoDate),
    location: "",
    athleteName: "",
    distanceKm: round(distanceKm, 2),
    durationSec: durationSec > 0 ? Math.round(durationSec) : 0,
    elevationGainM: elevationGainM > 0 ? Math.round(elevationGainM) : undefined,
    ...sportSpecificStats(sport, avgSpeedKmh, input.sessionMaxSpeedKmh),
    avgHeartRate: avgHr ? Math.round(avgHr) : undefined,
    avgCadence: avgCadence ? Math.round(avgCadence) : undefined,
    routeCoordinates,
    elevationProfile,
    paceProfile,
    splits,
    startTimeMs,
    endTimeMs,
  };
}

function sportSpecificStats(
  sport: ParsedSport,
  avgSpeedKmh: number | undefined,
  maxSpeedKmh: number | undefined
): Pick<
  ParsedActivity,
  "avgSpeedKmh" | "maxSpeedKmh" | "avgPaceMinPerKm" | "avgPacePer100m"
> {
  if (sport === "ride") {
    return {
      avgSpeedKmh: avgSpeedKmh ? round(avgSpeedKmh, 1) : undefined,
      maxSpeedKmh: maxSpeedKmh ? round(maxSpeedKmh, 1) : undefined,
    };
  }
  if (sport === "run" && avgSpeedKmh && avgSpeedKmh > 0) {
    return { avgPaceMinPerKm: 60 / avgSpeedKmh };
  }
  if (sport === "swim" && avgSpeedKmh && avgSpeedKmh > 0) {
    return { avgPacePer100m: Math.round(360 / avgSpeedKmh) };
  }
  return {};
}

export function detectSport(
  raw: string | undefined,
  filename: string
): ParsedSport {
  const s = (raw || "").toLowerCase();
  const f = filename.toLowerCase();
  if (
    s.includes("cycl") ||
    s.includes("bike") ||
    s.includes("ride") ||
    f.includes("ride") ||
    f.includes("bike")
  ) {
    return "ride";
  }
  if (s.includes("run") || f.includes("run")) {
    return "run";
  }
  if (s.includes("swim") || f.includes("swim")) {
    return "swim";
  }
  if (
    s.includes("triathlon") ||
    s.includes("multisport") ||
    f.includes("triathlon")
  ) {
    return "triathlon";
  }
  return "ride";
}

function cumulativeDistanceKm(points: TrackPoint[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) {
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
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDurationSec(points: TrackPoint[]): number {
  const times = points.map((p) => p.time).filter(isNum);
  if (times.length < 2) {
    return 0;
  }
  const last = times.at(-1) as number;
  return (last - times[0]) / 1000;
}

function cumulativeElevationGain(points: TrackPoint[]): number {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].elevation;
    const b = points[i].elevation;
    if (a !== undefined && b !== undefined && b > a) {
      gain += b - a;
    }
  }
  return gain;
}

/**
 * Per-km splits via cumulative-distance crossings. Uses linear interpolation
 * of timestamps between the two points that straddle each km boundary.
 */
function derivePerKmSplits(
  points: TrackPoint[],
  totalDistanceKm: number
): Split[] | undefined {
  if (totalDistanceKm < 1.5) {
    return;
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
    stamped.push({ time: p.time, cumM });
    lastLat = p.lat;
    lastLng = p.lng;
  }
  if (stamped.length < 2) {
    return;
  }

  const splits: Split[] = [];
  let nextKm = 1;
  let prevTime = stamped[0].time;
  for (let i = 1; i < stamped.length; i++) {
    while (stamped[i].cumM >= nextKm * 1000) {
      const a = stamped[i - 1];
      const b = stamped[i];
      const span = b.cumM - a.cumM || 1;
      const f = (nextKm * 1000 - a.cumM) / span;
      const tBoundary = a.time + (b.time - a.time) * f;
      const durSec = Math.round((tBoundary - prevTime) / 1000);
      if (durSec > 0) {
        splits.push({ km: nextKm, durationSec: durSec });
      }
      prevTime = tBoundary;
      nextKm += 1;
    }
  }
  return splits.length ? splits : undefined;
}

/**
 * Smoothed pace profile (sec/km) for runs. Derived from rolling distance and
 * time deltas, then resampled to a fixed length so themes don't have to
 * re-bucket per render.
 */
function derivePaceProfile(points: TrackPoint[]): number[] | undefined {
  const stamped: { time: number; lat: number; lng: number }[] = [];
  for (const p of points) {
    if (p.lat !== undefined && p.lng !== undefined && p.time !== undefined) {
      stamped.push({ time: p.time, lat: p.lat, lng: p.lng });
    }
  }
  if (stamped.length < 4) {
    return;
  }
  const paces: number[] = [];
  // Window in points — at typical 1Hz this is ~10s of running.
  const win = Math.max(4, Math.floor(stamped.length / 60));
  for (let i = win; i < stamped.length; i++) {
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
    return;
  }
  const smoothed = smooth(paces, PACE_SMOOTH_WINDOW);
  return resampleTo(
    smoothed,
    Math.min(PACE_TARGET_POINTS, smoothed.length)
  ).map((v) => Math.round(v));
}

function mean(xs: number[]): number | undefined {
  if (!xs.length) {
    return;
  }
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function isNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function toIsoDate(input?: string | number | Date): string {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function prettifyName(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
