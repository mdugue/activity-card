import type {
  ActivityData,
  Transition,
  TriSegment,
} from "@/components/app/sample-data";
import type { ParsedActivity } from "./parse-activity";

/**
 * Combine 2+ single-sport parsed activities into one triathlon ActivityData.
 * Segments are sorted by start time when known; transitions are the time
 * gaps between consecutive segments. Distances and durations are summed.
 */
export function assembleTriathlon(parts: ParsedActivity[]): ActivityData {
  if (parts.length < 2) {
    throw new Error("Need at least two activities to assemble a triathlon");
  }

  const sorted = [...parts].sort((a, b) => {
    if (a.startTimeMs !== undefined && b.startTimeMs !== undefined) {
      return a.startTimeMs - b.startTimeMs;
    }
    return 0;
  });

  const segments: TriSegment[] = sorted.map((p) => ({
    sport: triSportFor(p.sport),
    distanceKm: p.distanceKm,
    durationSec: p.durationSec,
    avgPacePer100m: p.avgPacePer100m,
    avgSpeedKmh: p.avgSpeedKmh,
    avgPaceMinPerKm: p.avgPaceMinPerKm,
    elevationGainM: p.elevationGainM,
    routeCoordinates: p.routeCoordinates,
    elevationProfile: p.elevationProfile,
    paceProfile: p.paceProfile,
  }));

  const transitions: Transition[] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const end = sorted[i].endTimeMs;
    const next = sorted[i + 1].startTimeMs;
    if (end !== undefined && next !== undefined && next > end) {
      const gapSec = Math.round((next - end) / 1000);
      transitions.push({ name: `T${i + 1}`, durationSec: gapSec });
    }
  }

  const totalDistance = round(
    segments.reduce((a, s) => a + (s.distanceKm || 0), 0),
    1
  );
  const totalDurationSec = sorted.reduce((a, p) => a + (p.durationSec ?? 0), 0);
  const totalElevation = sorted.reduce(
    (a, p) => a + (p.elevationGainM ?? 0),
    0
  );

  const first = sorted[0];
  const avgHrs = sorted
    .map((p) => p.avgHeartRate)
    .filter((n): n is number => n !== undefined);
  const avgHeartRate = avgHrs.length
    ? Math.round(avgHrs.reduce((a, b) => a + b, 0) / avgHrs.length)
    : undefined;

  // Segment-aligned array of Strava ids, `null` for file-sourced parts.
  // Length always matches `segments.length` so the UI can map ids → sports
  // without needing a separate "which segments are Strava" lookup. If no
  // part carries an id, leave the field undefined (pure-upload triathlon).
  const stravaActivityIds = sorted.map((p) => p.stravaActivityIds?.[0] ?? null);
  const anyStrava = stravaActivityIds.some((id) => id !== null);

  return {
    sport: "triathlon",
    title: deriveTriName(sorted),
    date: first.date,
    location: first.location || "",
    athleteName: first.athleteName || "",
    distanceKm: totalDistance,
    durationSec: totalDurationSec,
    elevationGainM: totalElevation > 0 ? totalElevation : undefined,
    avgHeartRate,
    segments,
    transitions: transitions.length ? transitions : undefined,
    stravaActivityIds: anyStrava ? stravaActivityIds : undefined,
  };
}

function triSportFor(s: ParsedActivity["sport"]): TriSegment["sport"] {
  if (s === "ride") {
    return "bike";
  }
  if (s === "swim") {
    return "swim";
  }
  return "run";
}

function deriveTriName(sorted: ParsedActivity[]): string {
  const sports = sorted.map((p) => p.sport);
  const triathlonShape =
    sports.length === 3 &&
    sports[0] === "swim" &&
    sports[1] === "ride" &&
    sports[2] === "run";
  if (triathlonShape) {
    return "Triathlon";
  }
  if (
    sports.length === 2 &&
    sports.includes("ride") &&
    sports.includes("run")
  ) {
    return "Brick session";
  }
  return "Multi-sport effort";
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
