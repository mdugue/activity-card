import { XMLParser } from "fast-xml-parser";
import FitParser from "fit-file-parser";

export type ParsedSport = "ride" | "run" | "swim" | "triathlon";

export interface ParsedActivity {
  athlete_name: string;
  avg_cadence?: number;
  avg_heart_rate?: number;
  avg_pace_min_per_km?: string;
  avg_pace_per_100m?: string;
  avg_speed_kmh?: number;
  date: string;
  distance_km: number;
  duration: string;
  /** Total elapsed seconds — preserved for triathlon aggregation. */
  duration_sec?: number;
  elevation_gain_m?: number;
  elevation_profile?: number[];
  end_time_ms?: number;
  location: string;
  max_speed_kmh?: number;
  ride_name: string;
  route_coordinates?: [number, number][];
  sport: ParsedSport;
  /** Epoch ms; used to order multi-file uploads and compute transitions. */
  start_time_ms?: number;
}

interface TrackPoint {
  cadence?: number;
  elevation?: number;
  heart_rate?: number;
  lat?: number;
  lng?: number;
  time?: number;
}

const GPX_EXT_RE = /\.gpx$/i;
const FIT_EXT_RE = /\.fit$/i;

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
      heart_rate:
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
          heart_rate: r.heart_rate,
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
    input.sessionAvgHr ?? mean(points.map((p) => p.heart_rate).filter(isNum));

  const avgCadence =
    input.sessionAvgCadence ?? mean(points.map((p) => p.cadence).filter(isNum));

  const avgSpeedKmh =
    input.sessionAvgSpeedKmh ??
    (durationSec > 0 ? (distanceKm / durationSec) * 3600 : undefined);

  const route_coordinates = points
    .filter((p) => p.lat !== undefined && p.lng !== undefined)
    .map((p) => [p.lng as number, -(p.lat as number)] as [number, number]);

  const elevation_profile = points
    .map((p) => p.elevation)
    .filter(isNum)
    .map((e) => Math.round(e));

  return {
    sport,
    ride_name: prettifyName(name),
    date: formatDate(isoDate),
    location: "",
    athlete_name: "",
    distance_km: round(distanceKm, 2),
    duration: formatDuration(durationSec),
    elevation_gain_m:
      elevationGainM > 0 ? Math.round(elevationGainM) : undefined,
    ...sportSpecificStats(sport, avgSpeedKmh, input.sessionMaxSpeedKmh),
    avg_heart_rate: avgHr ? Math.round(avgHr) : undefined,
    avg_cadence: avgCadence ? Math.round(avgCadence) : undefined,
    route_coordinates: route_coordinates.length ? route_coordinates : undefined,
    elevation_profile: elevation_profile.length ? elevation_profile : undefined,
    start_time_ms: startTimeMs,
    end_time_ms: endTimeMs,
    duration_sec: durationSec > 0 ? Math.round(durationSec) : undefined,
  };
}

function sportSpecificStats(
  sport: ParsedSport,
  avgSpeedKmh: number | undefined,
  maxSpeedKmh: number | undefined
): Pick<
  ParsedActivity,
  | "avg_speed_kmh"
  | "max_speed_kmh"
  | "avg_pace_min_per_km"
  | "avg_pace_per_100m"
> {
  if (sport === "ride") {
    return {
      avg_speed_kmh: avgSpeedKmh ? round(avgSpeedKmh, 1) : undefined,
      max_speed_kmh: maxSpeedKmh ? round(maxSpeedKmh, 1) : undefined,
    };
  }
  if (sport === "run" && avgSpeedKmh) {
    return { avg_pace_min_per_km: speedToPaceMinPerKm(avgSpeedKmh) };
  }
  if (sport === "swim" && avgSpeedKmh) {
    return { avg_pace_per_100m: speedToPacePer100m(avgSpeedKmh) };
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

function formatDuration(sec: number): string {
  if (!sec || sec < 0) {
    return "—";
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

function formatDate(input?: string | number | Date): string {
  if (!input) {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function speedToPaceMinPerKm(kmh: number): string {
  const secPerKm = 3600 / kmh;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function speedToPacePer100m(kmh: number): string {
  const secPer100m = 360 / kmh;
  const m = Math.floor(secPer100m / 60);
  const s = Math.round(secPer100m % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function prettifyName(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
