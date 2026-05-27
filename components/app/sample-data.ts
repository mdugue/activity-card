// Deterministic sample datasets — believable shapes via parametric math.
// Each route is in normalized [-1..1] x/y space; theme code re-projects to viewBox.

export type Sport = "ride" | "run" | "swim" | "triathlon";

export type Coord = [number, number];

export interface TriSegment {
  avg_pace_min_per_km?: string;
  avg_pace_per_100m?: string;
  avg_speed_kmh?: number;
  distance_km: number;
  duration: string;
  elevation_gain_m?: number;
  elevation_profile?: number[];
  pace_profile?: number[];
  route_coordinates?: Coord[];
  sport: "swim" | "bike" | "run";
}

export interface Split {
  avg_kmh?: number;
  km?: number;
  lap?: number;
  time: string;
}

export interface Zone {
  pct: number;
  zone: string;
}

export interface Transition {
  duration: string;
  name: string;
}

export interface ActivityData {
  athlete_name: string;
  avg_cadence?: number;
  avg_heart_rate?: number;
  avg_pace_min_per_km?: string;
  avg_pace_per_100m?: string;
  avg_speed_kmh?: number;
  date: string;
  distance_km: number;
  duration: string;
  elevation_gain_m?: number;
  elevation_profile?: number[];
  hr_zones?: Zone[];
  lap_paces_per_100m?: number[];
  location: string;
  max_speed_kmh?: number;
  normalized_power_w?: number;
  pace_profile?: number[];
  power_zones?: Zone[];
  ride_name: string;
  route_coordinates?: Coord[];
  segments?: TriSegment[];
  splits?: Split[];
  sport: Sport;
  stroke_count_avg?: number;
  swolf?: number;
  transitions?: Transition[];
  vam_mph?: number;
}

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
  // pace in seconds per km — lower is faster
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v =
      basePaceSec +
      varSec * Math.sin(t * 7 + seed) +
      varSec * 0.4 * Math.sin(t * 23 + seed * 2) +
      (t > 0.7 ? (t - 0.7) * 80 : 0); // fade at the end
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
  // an open-water rectangle-ish swim with drift
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

export const SAMPLE_RIDE: ActivityData = {
  sport: "ride",
  ride_name: "Saturday in the Elbsandstein",
  date: "May 18, 2026",
  location: "Sächsische Schweiz, Germany",
  athlete_name: "Manuel",
  distance_km: 87.3,
  duration: "3h 42m",
  elevation_gain_m: 1240,
  avg_speed_kmh: 23.6,
  max_speed_kmh: 58.2,
  avg_heart_rate: 142,
  avg_cadence: 84,
  normalized_power_w: 215,
  route_coordinates: genLoop(1.7, 180),
  elevation_profile: genElevation(2.3, 180, 180, 980),
  splits: [
    { km: 10, time: "24:18", avg_kmh: 24.7 },
    { km: 20, time: "50:02", avg_kmh: 23.3 },
    { km: 30, time: "1:16:44", avg_kmh: 22.4 },
    { km: 40, time: "1:42:20", avg_kmh: 23.5 },
    { km: 50, time: "2:08:01", avg_kmh: 23.4 },
    { km: 60, time: "2:33:18", avg_kmh: 23.7 },
    { km: 70, time: "2:58:54", avg_kmh: 23.4 },
    { km: 80, time: "3:24:11", avg_kmh: 23.6 },
  ],
  power_zones: [
    { zone: "Z1", pct: 12 },
    { zone: "Z2", pct: 38 },
    { zone: "Z3", pct: 27 },
    { zone: "Z4", pct: 14 },
    { zone: "Z5", pct: 7 },
    { zone: "Z6", pct: 2 },
  ],
  vam_mph: 612,
};

export const SAMPLE_RUN: ActivityData = {
  sport: "run",
  ride_name: "Föhrer Westwind",
  date: "April 27, 2026",
  location: "Föhr, North Sea",
  athlete_name: "Manuel",
  distance_km: 18.4,
  duration: "1h 32m",
  elevation_gain_m: 86,
  avg_pace_min_per_km: "4:59",
  avg_heart_rate: 158,
  avg_cadence: 178,
  route_coordinates: genOutBack(4.1, 140),
  elevation_profile: genElevation(0.9, 140, 4, 24),
  pace_profile: genPace(3.1, 140, 299, 22),
  splits: [
    { km: 1, time: "4:48" },
    { km: 2, time: "4:52" },
    { km: 3, time: "4:55" },
    { km: 4, time: "5:01" },
    { km: 5, time: "4:57" },
    { km: 6, time: "5:04" },
    { km: 7, time: "4:58" },
    { km: 8, time: "5:02" },
    { km: 9, time: "5:09" },
    { km: 10, time: "5:11" },
    { km: 11, time: "5:07" },
    { km: 12, time: "5:03" },
    { km: 13, time: "4:55" },
    { km: 14, time: "4:52" },
    { km: 15, time: "4:49" },
    { km: 16, time: "4:46" },
    { km: 17, time: "4:51" },
    { km: 18, time: "4:42" },
  ],
  hr_zones: [
    { zone: "Z1", pct: 6 },
    { zone: "Z2", pct: 22 },
    { zone: "Z3", pct: 48 },
    { zone: "Z4", pct: 21 },
    { zone: "Z5", pct: 3 },
  ],
};

export const SAMPLE_SWIM: ActivityData = {
  sport: "swim",
  ride_name: "Sunrise at Müggelsee",
  date: "June 02, 2026",
  location: "Berlin Müggelsee",
  athlete_name: "Manuel",
  distance_km: 2.4,
  duration: "47m 12s",
  avg_pace_per_100m: "1:58",
  avg_heart_rate: 138,
  swolf: 38,
  route_coordinates: swimRouteCoords,
  lap_paces_per_100m: genSwimLaps(24, 113, 5),
  stroke_count_avg: 16,
  splits: Array.from({ length: 24 }, (_, i) => ({
    lap: i + 1,
    time: `1:${50 + (i % 8)}`,
  })),
};

export const SAMPLE_TRI: ActivityData = {
  sport: "triathlon",
  ride_name: "IRONMAN 70.3 Lanzarote",
  date: "March 22, 2026",
  location: "Puerto del Carmen, Canary Islands",
  athlete_name: "Manuel",
  distance_km: 113,
  duration: "5h 18m",
  elevation_gain_m: 980,
  avg_heart_rate: 151,
  segments: [
    {
      sport: "swim",
      distance_km: 1.9,
      duration: "34:12",
      avg_pace_per_100m: "1:48",
      route_coordinates: triSwimRouteCoords,
    },
    {
      sport: "bike",
      distance_km: 90,
      duration: "2h 41m",
      avg_speed_kmh: 33.5,
      elevation_gain_m: 920,
      route_coordinates: genLoop(0.7, 140),
      elevation_profile: genElevation(0.7, 140, 20, 720),
    },
    {
      sport: "run",
      distance_km: 21.1,
      duration: "1h 38m",
      avg_pace_min_per_km: "4:38",
      elevation_gain_m: 60,
      route_coordinates: genOutBack(2.1, 100),
      pace_profile: genPace(2.1, 100, 278, 18),
    },
  ],
  transitions: [
    { name: "T1", duration: "2:14" },
    { name: "T2", duration: "1:48" },
  ],
};
