// Which signal drives the elevation/pace visualisations: prefer a usable
// elevation profile, otherwise fall back to pace. A present-but-degenerate
// elevation profile (0 or 1 points) must NOT shadow a usable pace profile, so
// the length check lives here rather than in a bare `??` at each call site
// (the seamless hero band and the wrap-up cross-viz both consume this).

import type { ActivityData } from "@/components/app/sample-data";

export interface PickedProfile {
  mode: "elevation" | "pace";
  profile: number[] | undefined;
}

export function pickProfile(data: ActivityData): PickedProfile {
  const elevation = data.elevationProfile;
  if (elevation && elevation.length > 1) {
    return { profile: elevation, mode: "elevation" };
  }
  return { profile: data.paceProfile, mode: "pace" };
}

/**
 * The effective band mode for a profile viz: for a multi-activity project the
 * metric the collected segments share (`seg.useElevation`), otherwise the
 * single-activity `fallback` from `pickProfile`. Pass the already-resolved
 * `seg` (or `null`) so callers don't re-walk the segments.
 */
export function bandModeFor(
  seg: { useElevation: boolean } | null,
  fallback: "elevation" | "pace"
): "elevation" | "pace" {
  if (seg) {
    return seg.useElevation ? "elevation" : "pace";
  }
  return fallback;
}
