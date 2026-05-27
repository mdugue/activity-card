import type { ActivityData, TriSegment } from "@/components/app/sample-data";
import type { ParsedActivity } from "./parse-activity";

/**
 * Combine 2+ single-sport parsed activities into one triathlon ActivityData.
 * Segments are sorted by start time when known; transitions are the time gaps
 * between consecutive segments. Segment durations & distances are summed.
 */
export function assembleTriathlon(parts: ParsedActivity[]): ActivityData {
  if (parts.length < 2) {
    throw new Error("Need at least two activities to assemble a triathlon");
  }

  // Stable: parts with start_time_ms sort by it; the rest keep input order.
  const sorted = [...parts].sort((a, b) => {
    if (a.start_time_ms !== undefined && b.start_time_ms !== undefined) {
      return a.start_time_ms - b.start_time_ms;
    }
    return 0;
  });

  const segments: TriSegment[] = sorted.map((p) => ({
    sport: triSportFor(p.sport),
    distance_km: p.distance_km,
    duration: p.duration,
    avg_pace_per_100m: p.avg_pace_per_100m,
    avg_speed_kmh: p.avg_speed_kmh,
    avg_pace_min_per_km: p.avg_pace_min_per_km,
    elevation_gain_m: p.elevation_gain_m,
    route_coordinates: p.route_coordinates,
    elevation_profile: p.elevation_profile,
  }));

  const transitions: { name: string; duration: string }[] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const end = sorted[i].end_time_ms;
    const next = sorted[i + 1].start_time_ms;
    if (end !== undefined && next !== undefined && next > end) {
      const gapSec = Math.round((next - end) / 1000);
      // T1, T2, T3… match the convention in the triathlon theme
      transitions.push({
        name: `T${i + 1}`,
        duration: formatGap(gapSec),
      });
    }
  }

  const totalDistance = round(
    segments.reduce((a, s) => a + (s.distance_km || 0), 0),
    1
  );
  const totalDurationSec = sorted.reduce(
    (a, p) => a + (p.duration_sec ?? 0),
    0
  );
  const totalElevation = sorted.reduce(
    (a, p) => a + (p.elevation_gain_m ?? 0),
    0
  );

  const first = sorted[0];
  const avgHrs = sorted
    .map((p) => p.avg_heart_rate)
    .filter((n): n is number => n !== undefined);
  const avgHr = avgHrs.length
    ? Math.round(avgHrs.reduce((a, b) => a + b, 0) / avgHrs.length)
    : undefined;

  return {
    sport: "triathlon",
    ride_name: deriveTriName(sorted),
    date: first.date,
    location: first.location || "",
    athlete_name: first.athlete_name || "",
    distance_km: totalDistance,
    duration: formatDuration(totalDurationSec),
    elevation_gain_m: totalElevation > 0 ? totalElevation : undefined,
    avg_heart_rate: avgHr,
    segments,
    transitions: transitions.length ? transitions : undefined,
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

function formatGap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
