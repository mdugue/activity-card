/**
 * Deterministic sample datasets. The canonical `ActivityData` shape lives in
 * `lib/activity.ts`; this file only builds fixtures of it.
 */

import type { ActivityData, Coord } from "@/lib/activity";

// Re-export the domain types for any straggler imports; new code should import
// from `@/lib/activity` directly.
export type {
  ActivityData,
  ActivitySource,
  Coord,
  Split,
  Sport,
  Transition,
  TriSegment,
  Zone,
} from "@/lib/activity";

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

export function genPower(
  seed: number,
  n: number,
  baseW = 215,
  range = 130
): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v =
      baseW +
      range * 0.5 * Math.sin(t * 6 + seed) +
      range * 0.32 * Math.sin(t * 17 + seed * 2) +
      range * 0.2 * Math.sin(t * 41 + seed * 4);
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

export function genSpeed(
  seed: number,
  n: number,
  baseKmh = 24,
  range = 18
): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v =
      baseKmh +
      range * 0.42 * Math.sin(t * 5 + seed) +
      range * 0.3 * Math.sin(t * 13 + seed * 3) +
      range * 0.16 * Math.sin(t * 37 + seed * 6);
    out.push(Math.max(0, Math.round(v * 10) / 10));
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

/** Shift a shape by (dx, dy) — used to place a project's legs in distinct
 * spots, the way real GPS legs sit apart (swim by the shore, bike out in the
 * country, run near the finish) so a shared-coordinate render shows them all. */
function translate(coords: Coord[], dx: number, dy: number): Coord[] {
  return coords.map(([x, y]): Coord => [x + dx, y + dy]);
}

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
  powerProfile: genPower(1.3, 120, 215, 150),
  speedProfile: genSpeed(2.7, 120, 23.6, 22),
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
      // Legs are offset into distinct spots (as real GPS legs are) so the
      // shared-coordinate route render shows all three, not one on top of another.
      routeCoordinates: translate(triSwimRouteCoords, 0, -1.5),
    },
    {
      sport: "bike",
      distanceKm: 90,
      durationSec: 2 * 3600 + 41 * 60,
      avgSpeedKmh: 33.5,
      elevationGainM: 920,
      routeCoordinates: translate(genLoop(0.7, 140), -0.2, 0.45),
      elevationProfile: genElevation(0.7, 140, 20, 720),
    },
    {
      sport: "run",
      distanceKm: 21.1,
      durationSec: 1 * 3600 + 38 * 60,
      avgPaceMinPerKm: 4 + 38 / 60,
      elevationGainM: 60,
      routeCoordinates: translate(genOutBack(2.1, 100), 1.7, -0.6),
      elevationProfile: genElevation(2.1, 100, 6, 70),
      paceProfile: genPace(2.1, 100, 278, 18),
    },
  ],
  transitions: [
    { name: "T1", durationSec: 2 * 60 + 14 },
    { name: "T2", durationSec: 1 * 60 + 48 },
  ],
};

// A two-leg project (bike + run) — the common "brick" session. The run is a
// small loop near the end of the bike (a realistic relative size/position), to
// exercise multi-route rendering where one leg is much smaller than the other.
const brickBike = translate(genLoop(1.1, 160), 0, 0);
const brickRun = translate(
  genOutBack(3.3, 90).map(([x, y]): Coord => [x * 0.34, y * 0.34]),
  1.45,
  -0.15
);

export const SAMPLE_BRICK: ActivityData = {
  sport: "triathlon",
  title: "Brick session",
  date: "2026-06-05",
  location: "Sächsische Schweiz, Germany",
  athleteName: "Manuel",
  distanceKm: 71.6,
  durationSec: 3 * 3600 + 9 * 60,
  elevationGainM: 477,
  avgHeartRate: 148,
  segments: [
    {
      sport: "bike",
      distanceKm: 60,
      durationSec: 2 * 3600 + 28 * 60,
      avgSpeedKmh: 24.3,
      elevationGainM: 430,
      routeCoordinates: brickBike,
      elevationProfile: genElevation(1.1, 160, 120, 430),
    },
    {
      sport: "run",
      distanceKm: 11.6,
      durationSec: 41 * 60,
      avgPaceMinPerKm: 3 + 32 / 60,
      elevationGainM: 47,
      routeCoordinates: brickRun,
      elevationProfile: genElevation(3.3, 90, 110, 60),
      paceProfile: genPace(3.3, 90, 212, 14),
    },
  ],
  transitions: [{ name: "T1", durationSec: 1 * 60 + 36 }],
};
