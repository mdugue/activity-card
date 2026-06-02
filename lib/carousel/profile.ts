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
