import { XMLParser } from "fast-xml-parser";
import FitParser from "fit-file-parser";
import type { Coord, Split } from "@/components/app/sample-data";
import { resampleTo, simplifyToCount, smooth } from "@/lib/simplify";

export type ParsedSport = "ride" | "run" | "swim" | "triathlon";

/**
 * Output shape used by `assembleTriathlon` and the page-level adopter.
 * All numerics are raw — never preformatted. `ActivityData` is a superset
 * of these fields; missing pieces (zones, splits beyond the basics) come
 * from sport-appropriate sample fallbacks in `adoptParsed`.
 */
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
  title: string;
}

interface TrackPoint {
  cadence?: number;
  elevation?: number;
  heartRate?: number;
  lat?: number;
  lng?: number;
  time?: number;
}

const GPX_EXT_RE = /\.gpx$/i;
const FIT_EXT_RE = /\.fit$/i;
const ROUTE_TARGET_POINTS = 150;
const ELEVATION_TARGET_POINTS = 80;
const PACE_TARGET_POINTS = 80;
const PACE_SMOOTH_WINDOW = 7;

export async function parseActivityFile(file: File): Promise<ParsedActivity> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "gpx") {
    return parseGpx(await file.text(), file.name);
  }
  if (ext === "fit") {
    return parseFit(await file.arrayBuffer(), file.name);
  }
  throw new Error(`Unsupported file extension: ${ext}`);
}

/* ---------------- GPX ---------------- */

interface GpxTrkPt {
  "@_lat": string;
  "@_lon": string;
  ele?: string | number;
  extensions?: {
    "gpxtpx:TrackPointExtension"?: {
      "gpxtpx:hr"?: string | number;
      "gpxtpx:cad"?: string | number;
    };
  };
  time?: string;
}

function parseGpx(text: string, filename: string): ParsedActivity {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const xml = parser.parse(text) as {
    gpx?: {
      metadata?: { name?: string; time?: string };
      trk?: {
        name?: string;
        type?: string;
        trkseg?:
          | { trkpt: GpxTrkPt | GpxTrkPt[] }
          | { trkpt: GpxTrkPt | GpxTrkPt[] }[];
      };
    };
  };

  const trk = xml.gpx?.trk;
  let segs: { trkpt: GpxTrkPt | GpxTrkPt[] }[] = [];
  if (Array.isArray(trk?.trkseg)) {
    segs = trk.trkseg;
  } else if (trk?.trkseg) {
    segs = [trk.trkseg];
  }
  const flatPts: GpxTrkPt[] = [];
  for (const seg of segs) {
    const pts = seg.trkpt;
    if (Array.isArray(pts)) {
      flatPts.push(...pts);
    } else if (pts) {
      flatPts.push(pts);
    }
  }

  const points: TrackPoint[] = flatPts.map((p) => {
    const lat = Number.parseFloat(p["@_lat"]);
    const lng = Number.parseFloat(p["@_lon"]);
    const elevation = p.ele === undefined ? undefined : Number(p.ele);
    const time = p.time ? Date.parse(p.time) : undefined;
    const ext = p.extensions?.["gpxtpx:TrackPointExtension"];
    return {
      lat,
      lng,
      elevation,
      time,
      heartRate:
        ext?.["gpxtpx:hr"] === undefined ? undefined : Number(ext["gpxtpx:hr"]),
      cadence:
        ext?.["gpxtpx:cad"] === undefined
          ? undefined
          : Number(ext["gpxtpx:cad"]),
    };
  });

  const sport = detectSport(trk?.type, filename);
  return finalise({
    points,
    sport,
    name:
      trk?.name || xml.gpx?.metadata?.name || filename.replace(GPX_EXT_RE, ""),
    isoDate: xml.gpx?.metadata?.time || points[0]?.time,
  });
}

/* ---------------- FIT ---------------- */

interface FitData {
  activity?: {
    sessions?: {
      sport?: string;
      sub_sport?: string;
      start_time?: Date | string;
      total_distance?: number;
      total_elapsed_time?: number;
      total_ascent?: number;
      avg_speed?: number;
      max_speed?: number;
      avg_heart_rate?: number;
      avg_cadence?: number;
      avg_running_cadence?: number;
    }[];
  };
  records?: {
    position_lat?: number;
    position_long?: number;
    altitude?: number;
    timestamp?: Date | string;
    heart_rate?: number;
    cadence?: number;
  }[];
}

function parseFit(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedActivity> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "km/h",
      lengthUnit: "km",
      elapsedRecordField: true,
      mode: "list",
    });
    parser.parse(buffer, (err, data) => {
      if (err) {
        reject(new Error(`FIT parse failed: ${err}`));
        return;
      }
      const fit = (data ?? {}) as FitData;
      const session = fit.activity?.sessions?.[0];
      const records = fit.records || [];
      const points: TrackPoint[] = records
        .filter(
          (r) => r.position_lat !== undefined && r.position_long !== undefined
        )
        .map((r) => ({
          lat: r.position_lat,
          lng: r.position_long,
          elevation: r.altitude,
          time: r.timestamp ? new Date(r.timestamp).getTime() : undefined,
          heartRate: r.heart_rate,
          cadence: r.cadence,
        }));

      const sport = detectSport(session?.sport, filename);
      const result = finalise({
        points,
        sport,
        name: filename.replace(FIT_EXT_RE, ""),
        isoDate: session?.start_time || points[0]?.time,
        sessionDistanceKm: session?.total_distance,
        sessionDurationSec: session?.total_elapsed_time,
        sessionElevationM: session?.total_ascent,
        sessionAvgSpeedKmh: session?.avg_speed,
        sessionMaxSpeedKmh: session?.max_speed,
        sessionAvgHr: session?.avg_heart_rate,
        sessionAvgCadence: session?.avg_cadence || session?.avg_running_cadence,
      });
      resolve(result);
    });
  });
}

/* ---------------- shared finalisation ---------------- */

interface FinaliseInput {
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

function finalise(input: FinaliseInput): ParsedActivity {
  const { points, sport, name, isoDate } = input;

  const distanceKm = input.sessionDistanceKm ?? cumulativeDistanceKm(points);
  const durationSec = input.sessionDurationSec ?? totalDurationSec(points);

  const ptTimes = points.map((p) => p.time).filter(isNum);
  const startTimeMs =
    isoDate === undefined ? ptTimes[0] : new Date(isoDate).getTime();
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
    // float minutes per km
    return { avgPaceMinPerKm: 60 / avgSpeedKmh };
  }
  if (sport === "swim" && avgSpeedKmh && avgSpeedKmh > 0) {
    // seconds per 100m
    return { avgPacePer100m: Math.round(360 / avgSpeedKmh) };
  }
  return {};
}

function detectSport(raw: string | undefined, filename: string): ParsedSport {
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
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.lat === undefined || p.lng === undefined || p.time === undefined) {
      continue;
    }
    if (stamped.length > 0) {
      const prev = points[i - 1];
      if (prev?.lat !== undefined && prev.lng !== undefined) {
        cumM += haversineMeters(prev.lat, prev.lng, p.lat, p.lng);
      }
    }
    stamped.push({ time: p.time, cumM });
  }
  if (stamped.length < 2) {
    return;
  }

  const splits: Split[] = [];
  let nextKm = 1;
  let prevTime = stamped[0].time;
  for (let i = 1; i < stamped.length; i++) {
    while (stamped[i].cumM >= nextKm * 1000) {
      // interpolate the time at the kilometre boundary
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
