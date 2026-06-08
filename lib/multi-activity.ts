/**
 * Multi-activity ("project") helpers — pulling the per-leg route and profile
 * data out of an `ActivityData` whose work is split across `segments` (a
 * triathlon, a brick session, any combined multi-sport effort).
 *
 * Themes that render a single hero route / elevation curve read the *top-level*
 * `routeCoordinates` / `elevationProfile`, which a multi-activity project leaves
 * undefined (the geometry lives on each segment). These helpers surface the
 * segments so a theme can overlay every leg instead of rendering nothing. Kept
 * JSX-free and pure so the selection logic is unit-testable.
 */

import type {
  ActivityData,
  Coord,
  TriSegment,
} from "@/components/app/sample-data";

/** A project carries two or more segments to combine. */
export function isMultiActivity(data: ActivityData): boolean {
  return (data.segments?.length ?? 0) >= 2;
}

export interface SegmentRoute {
  coords: Coord[];
  distanceKm: number;
  sport: TriSegment["sport"];
}

/** Segments that have a usable route, in order. */
export function segmentRoutes(data: ActivityData): SegmentRoute[] {
  const out: SegmentRoute[] = [];
  for (const s of data.segments ?? []) {
    if (s.routeCoordinates && s.routeCoordinates.length > 1) {
      out.push({
        coords: s.routeCoordinates,
        distanceKm: s.distanceKm,
        sport: s.sport,
      });
    }
  }
  return out;
}

export interface SegmentProfiles {
  /** Per-leg distance (km), index-aligned with `profiles`. */
  distances: number[];
  profiles: number[][];
  sports: TriSegment["sport"][];
  /** `true` when the collected metric is elevation, `false` when it's pace. */
  useElevation: boolean;
}

/**
 * Collect a single, *consistent* metric across the segments so overlaid curves
 * can share one vertical scale: elevation when any leg has it, otherwise pace.
 * Only legs carrying the chosen metric are included (e.g. a swim leg with no
 * elevation is skipped when biking/running legs do have it).
 */
export function segmentProfiles(data: ActivityData): SegmentProfiles {
  const segs = data.segments ?? [];
  const useElevation = segs.some((s) => (s.elevationProfile?.length ?? 0) > 1);
  const profiles: number[][] = [];
  const distances: number[] = [];
  const sports: TriSegment["sport"][] = [];
  for (const s of segs) {
    const p = useElevation ? s.elevationProfile : s.paceProfile;
    if (p && p.length > 1) {
      profiles.push(p);
      distances.push(s.distanceKm);
      sports.push(s.sport);
    }
  }
  return { profiles, distances, sports, useElevation };
}

/**
 * Collect one *specific* per-leg series (elevation or pace) with its distances —
 * for callers that need a fixed metric rather than `segmentProfiles`'
 * elevation-preferred pick (e.g. a theme showing a dedicated pace sparkline).
 */
export function segmentSeries(
  data: ActivityData,
  field: "elevationProfile" | "paceProfile"
): { distances: number[]; profiles: number[][] } {
  const profiles: number[][] = [];
  const distances: number[] = [];
  for (const s of data.segments ?? []) {
    const p = s[field];
    if (p && p.length > 1) {
      profiles.push(p);
      distances.push(s.distanceKm);
    }
  }
  return { profiles, distances };
}
