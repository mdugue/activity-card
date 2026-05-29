/**
 * Deterministic sample datasets and the canonical `ActivityData` shape.
 *
 * Activity numerics are stored raw (seconds, km, float minutes, integer
 * sec/100m). Themes call `lib/format.ts` to render. Route coordinates live
 * in normalised x/y for the samples and in `[lng, -lat]` for parsed files —
 * `chart-helpers.ts` only cares about bbox-relative positions.
 */

export type Sport = "ride" | "run" | "swim" | "triathlon";

export type Coord = [number, number];

export interface TriSegment {
  avgPaceMinPerKm?: number; // run, float minutes
  avgPacePer100m?: number; // swim, seconds
  avgSpeedKmh?: number; // bike
  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;
  elevationProfile?: number[];
  paceProfile?: number[];
  routeCoordinates?: Coord[];
  sport: "swim" | "bike" | "run";
}

export interface Split {
  avgSpeedKmh?: number; // ride splits
  durationSec: number;
  km?: number; // per-km splits for run / ride
  lap?: number; // per-lap for swim
}

export interface Zone {
  pct: number;
  zone: string;
}

export interface Transition {
  durationSec: number;
  name: string; // "T1", "T2", …
}

export type ActivitySource = "upload" | "strava";

export interface ActivityData {
  athleteName: string;
  avgCadence?: number;
  avgHeartRate?: number;
  avgPaceMinPerKm?: number; // run, float minutes (4.95 = 4:57/km)
  avgPacePer100m?: number; // swim, integer seconds

  avgSpeedKmh?: number; // ride
  date: string; // ISO date string; format at render

  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;
  elevationProfile?: number[];
  hrZones?: Zone[];
  lapPacesPer100m?: number[]; // swim, sec/100m per lap
  location: string;
  maxSpeedKmh?: number; // ride
  normalizedPowerW?: number; // ride
  paceProfile?: number[]; // run, sec/km
  powerZones?: Zone[];

  routeCoordinates?: Coord[];

  segments?: TriSegment[];
  /** Where this activity came from. Drives provider attribution on the card
   * (Strava requires a "Powered by Strava" mark whenever their data is shown). */
  source?: ActivitySource;
  splits?: Split[];
  sport: Sport;
  strokeCountAvg?: number; // swim
  swolf?: number; // swim
  title: string;
  transitions?: Transition[];
  vamMph?: number; // ride: vertical metres / hour (label kept "mph" for legacy)
}

/* ------------- deterministic shape generators ------------- */

export function genLoop(seed: number, n: number): Coord[] {
  const out: Coord[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const angle = t * Math.PI * 2;
    const r =
      0.85 +
      0.22 * Math.sin(seed + t * 7) +
      0.14 * Math.cos(seed * 1.7 + t * 13);
    const x = Math.cos(angle) * r + 0.12 * Math.sin(t * 19 + seed * 2);
    const y = Math.sin(angle) * r + 0.12 * Math.cos(t * 23 + seed * 3);
    out.push([x, y]);
  }
  return out;
}

export function genOutBack(seed: number, n: number): Coord[] {
  const out: Coord[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const fold = t < 0.5 ? t * 2 : (1 - t) * 2;
    const x = fold * 1.6 - 0.8 + 0.08 * Math.sin(t * 31 + seed);
    const y =
      0.55 * Math.sin(t * 9 + seed) +
      0.12 * Math.cos(t * 47) +
      (t < 0.5 ? 0.05 : -0.05);
    out.push([x, y]);
  }
  return out;
}

export function genElevation(
  seed: number,
  n: number,
  baseline = 200,
  range = 1100
): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v =
      baseline +
      range * 0.5 * (1 - Math.cos(t * Math.PI * 2.3 + seed)) +
      range * 0.18 * Math.sin(t * 11 + seed * 2) +
      range * 0.08 * Math.sin(t * 31 + seed * 5);
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

export function genPace(
  seed: number,
  n: number,
  basePaceSec = 272,
  varSec = 35
): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v =
      basePaceSec +
      varSec * Math.sin(t * 7 + seed) +
      varSec * 0.4 * Math.sin(t * 23 + seed * 2) +
      (t > 0.7 ? (t - 0.7) * 80 : 0);
    out.push(Math.round(v));
  }
  return out;
}

export function genSwimLaps(n: number, basePaceSec = 108, drift = 6): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(Math.round(basePaceSec + drift * t + 3 * Math.sin(i * 0.9)));
  }
  return out;
}

const swimRouteCoords = ((): Coord[] => {
  const out: Coord[] = [];
  for (let i = 0; i < 120; i++) {
    const t = i / 119;
    const seg = Math.floor(t * 4);
    const local = t * 4 - seg;
    let x: number;
    let y: number;
    if (seg === 0) {
      x = -0.8 + local * 1.6;
      y = -0.6 + 0.04 * Math.sin(t * 30);
    } else if (seg === 1) {
      x = 0.8 + 0.05 * Math.cos(t * 25);
      y = -0.6 + local * 1.2;
    } else if (seg === 2) {
      x = 0.8 - local * 1.6;
      y = 0.6 + 0.04 * Math.sin(t * 32);
    } else {
      x = -0.8 + 0.05 * Math.sin(t * 27);
      y = 0.6 - local * 1.2;
    }
    out.push([x, y]);
  }
  return out;
})();

const triSwimRouteCoords = ((): Coord[] => {
  const out: Coord[] = [];
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    const x = -0.7 + t * 1.4 + 0.08 * Math.sin(t * 12);
    const y = 0.3 * Math.sin(t * 6) + 0.06 * Math.cos(t * 21);
    out.push([x, y]);
  }
  return out;
})();

/* ------------- sample fixtures ------------- */

export const SAMPLE_RIDE: ActivityData = {
  sport: "ride",
  title: "Saturday in the Elbsandstein",
  date: "2026-05-18",
  location: "Sächsische Schweiz, Germany",
  athleteName: "Manuel",
  distanceKm: 87.3,
  durationSec: 3 * 3600 + 42 * 60,
  elevationGainM: 1240,
  avgSpeedKmh: 23.6,
  maxSpeedKmh: 58.2,
  avgHeartRate: 142,
  avgCadence: 84,
  normalizedPowerW: 215,
  routeCoordinates: genLoop(1.7, 180),
  elevationProfile: genElevation(2.3, 180, 180, 980),
  splits: [
    { km: 10, durationSec: 24 * 60 + 18, avgSpeedKmh: 24.7 },
    { km: 20, durationSec: 50 * 60 + 2, avgSpeedKmh: 23.3 },
    { km: 30, durationSec: 1 * 3600 + 16 * 60 + 44, avgSpeedKmh: 22.4 },
    { km: 40, durationSec: 1 * 3600 + 42 * 60 + 20, avgSpeedKmh: 23.5 },
    { km: 50, durationSec: 2 * 3600 + 8 * 60 + 1, avgSpeedKmh: 23.4 },
    { km: 60, durationSec: 2 * 3600 + 33 * 60 + 18, avgSpeedKmh: 23.7 },
    { km: 70, durationSec: 2 * 3600 + 58 * 60 + 54, avgSpeedKmh: 23.4 },
    { km: 80, durationSec: 3 * 3600 + 24 * 60 + 11, avgSpeedKmh: 23.6 },
  ],
  powerZones: [
    { zone: "Z1", pct: 12 },
    { zone: "Z2", pct: 38 },
    { zone: "Z3", pct: 27 },
    { zone: "Z4", pct: 14 },
    { zone: "Z5", pct: 7 },
    { zone: "Z6", pct: 2 },
  ],
  vamMph: 612,
};

export const SAMPLE_RUN: ActivityData = {
  sport: "run",
  title: "Föhrer Westwind",
  date: "2026-04-27",
  location: "Föhr, North Sea",
  athleteName: "Manuel",
  distanceKm: 18.4,
  durationSec: 1 * 3600 + 32 * 60,
  elevationGainM: 86,
  avgPaceMinPerKm: 4 + 59 / 60,
  avgHeartRate: 158,
  avgCadence: 178,
  routeCoordinates: genOutBack(4.1, 140),
  elevationProfile: genElevation(0.9, 140, 4, 24),
  paceProfile: genPace(3.1, 140, 299, 22),
  splits: [
    { km: 1, durationSec: 4 * 60 + 48 },
    { km: 2, durationSec: 4 * 60 + 52 },
    { km: 3, durationSec: 4 * 60 + 55 },
    { km: 4, durationSec: 5 * 60 + 1 },
    { km: 5, durationSec: 4 * 60 + 57 },
    { km: 6, durationSec: 5 * 60 + 4 },
    { km: 7, durationSec: 4 * 60 + 58 },
    { km: 8, durationSec: 5 * 60 + 2 },
    { km: 9, durationSec: 5 * 60 + 9 },
    { km: 10, durationSec: 5 * 60 + 11 },
    { km: 11, durationSec: 5 * 60 + 7 },
    { km: 12, durationSec: 5 * 60 + 3 },
    { km: 13, durationSec: 4 * 60 + 55 },
    { km: 14, durationSec: 4 * 60 + 52 },
    { km: 15, durationSec: 4 * 60 + 49 },
    { km: 16, durationSec: 4 * 60 + 46 },
    { km: 17, durationSec: 4 * 60 + 51 },
    { km: 18, durationSec: 4 * 60 + 42 },
  ],
  hrZones: [
    { zone: "Z1", pct: 6 },
    { zone: "Z2", pct: 22 },
    { zone: "Z3", pct: 48 },
    { zone: "Z4", pct: 21 },
    { zone: "Z5", pct: 3 },
  ],
};

export const SAMPLE_SWIM: ActivityData = {
  sport: "swim",
  title: "Sunrise at Müggelsee",
  date: "2026-06-02",
  location: "Berlin Müggelsee",
  athleteName: "Manuel",
  distanceKm: 2.4,
  durationSec: 47 * 60 + 12,
  avgPacePer100m: 60 + 58,
  avgHeartRate: 138,
  swolf: 38,
  routeCoordinates: swimRouteCoords,
  lapPacesPer100m: genSwimLaps(24, 113, 5),
  strokeCountAvg: 16,
  splits: Array.from({ length: 24 }, (_, i) => ({
    lap: i + 1,
    durationSec: 60 + 50 + (i % 8),
  })),
};

export const SAMPLE_TRI: ActivityData = {
  sport: "triathlon",
  title: "IRONMAN 70.3 Lanzarote",
  date: "2026-03-22",
  location: "Puerto del Carmen, Canary Islands",
  athleteName: "Manuel",
  distanceKm: 113,
  durationSec: 5 * 3600 + 18 * 60,
  elevationGainM: 980,
  avgHeartRate: 151,
  segments: [
    {
      sport: "swim",
      distanceKm: 1.9,
      durationSec: 34 * 60 + 12,
      avgPacePer100m: 60 + 48,
      routeCoordinates: triSwimRouteCoords,
    },
    {
      sport: "bike",
      distanceKm: 90,
      durationSec: 2 * 3600 + 41 * 60,
      avgSpeedKmh: 33.5,
      elevationGainM: 920,
      routeCoordinates: genLoop(0.7, 140),
      elevationProfile: genElevation(0.7, 140, 20, 720),
    },
    {
      sport: "run",
      distanceKm: 21.1,
      durationSec: 1 * 3600 + 38 * 60,
      avgPaceMinPerKm: 4 + 38 / 60,
      elevationGainM: 60,
      routeCoordinates: genOutBack(2.1, 100),
      paceProfile: genPace(2.1, 100, 278, 18),
    },
  ],
  transitions: [
    { name: "T1", durationSec: 2 * 60 + 14 },
    { name: "T2", durationSec: 1 * 60 + 48 },
  ],
};
