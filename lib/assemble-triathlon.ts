import type { ActivityData, Transition, TriSegment } from "@/lib/activity";

import type { ParsedActivity } from "./parse-activity";

const triSportFor = (s: ParsedActivity["sport"]): TriSegment["sport"] => {
  if (s === "ride") {
    return "bike";
  }
  if (s === "swim") {
    return "swim";
  }
  return "run";
};

const deriveTriName = (sorted: ParsedActivity[]): string => {
  const sports = sorted.map((p) => p.sport);
  const isSwimBikeRun =
    sports.length === 3 &&
    sports[0] === "swim" &&
    sports[1] === "ride" &&
    sports[2] === "run";
  if (isSwimBikeRun) {
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
};

const round = (n: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/**
 * Combine 2+ single-sport parsed activities into one triathlon ActivityData.
 * Segments are sorted by start time when known; transitions are the time
 * gaps between consecutive segments. Distances and durations are summed.
 */
export const assembleTriathlon = (parts: ParsedActivity[]): ActivityData => {
  if (parts.length < 2) {
    throw new Error("Need at least two activities to assemble a triathlon");
  }

  const sorted = parts.toSorted((a, b) => {
    if (a.startTimeMs !== undefined && b.startTimeMs !== undefined) {
      return a.startTimeMs - b.startTimeMs;
    }
    return 0;
  });

  const segments: TriSegment[] = sorted.map((p) => ({
    avgPaceMinPerKm: p.avgPaceMinPerKm,
    avgPacePer100m: p.avgPacePer100m,
    avgSpeedKmh: p.avgSpeedKmh,
    distanceKm: p.distanceKm,
    durationSec: p.durationSec,
    elevationGainM: p.elevationGainM,
    elevationProfile: p.elevationProfile,
    paceProfile: p.paceProfile,
    routeCoordinates: p.routeCoordinates,
    sport: triSportFor(p.sport),
  }));

  const transitions: Transition[] = [];
  for (let i = 0; i + 1 < sorted.length; i += 1) {
    const end = sorted[i].endTimeMs;
    const next = sorted[i + 1].startTimeMs;
    if (end !== undefined && next !== undefined && next > end) {
      const gapSec = Math.round((next - end) / 1000);
      transitions.push({ durationSec: gapSec, name: `T${i + 1}` });
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

  const [first] = sorted;
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

  // Pool every part's Strava photos so a combined card offers all of them.
  const stravaPhotos = sorted.flatMap((p) => p.stravaPhotos ?? []);

  return {
    athleteName: first.athleteName || "",
    avgHeartRate,
    date: first.date,
    distanceKm: totalDistance,
    durationSec: totalDurationSec,
    elevationGainM: totalElevation > 0 ? totalElevation : undefined,
    location: first.location || "",
    segments,
    sport: "triathlon",
    stravaActivityIds: anyStrava ? stravaActivityIds : undefined,
    stravaPhotos: stravaPhotos.length ? stravaPhotos : undefined,
    title: deriveTriName(sorted),
    transitions: transitions.length ? transitions : undefined,
  };
};
