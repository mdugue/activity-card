// Which signal drives the carousel's elevation/pace visualisations (the Ascent
// hero band, the mini-viz charts). A thin adapter over the ONE shared rule in
// `lib/profile-signal.ts` — elevation, else pace, else swim laps, and only a
// series with enough points to draw. A present-but-degenerate elevation profile
// (0 or 1 points) therefore never shadows a usable pace profile, and a
// lap-only pool swim still gets a (pace-oriented) laps profile.

import type { ActivityData } from "@/lib/activity";
import { profileSignal } from "@/lib/profile-signal";
import type { ProfileSignal } from "@/lib/profile-signal";

export interface PickedProfile {
  /** How the band orients the curve: laps are a pace (lower = faster). */
  mode: "elevation" | "pace";
  /** The drawable series, or `undefined` when there's nothing to draw. */
  profile: number[] | undefined;
  /** Which series was picked (`"none"` when nothing is drawable). */
  signal: ProfileSignal["mode"];
}

export function pickProfile(data: ActivityData): PickedProfile {
  const picked = profileSignal(data);
  return {
    mode: picked.mode === "elevation" ? "elevation" : "pace",
    profile: picked.series ?? undefined,
    signal: picked.mode,
  };
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
