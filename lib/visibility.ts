import type { ActivityData } from "@/components/app/sample-data";

export interface Visibility {
  athleteName: boolean;
  heartRate: boolean;
  location: boolean;
  photoBackdrop: boolean;
  splits: boolean;
}

export const DEFAULT_VISIBILITY: Visibility = {
  athleteName: true,
  location: true,
  heartRate: true,
  splits: true,
  photoBackdrop: true,
};

/**
 * Strip fields the user has toggled off before handing data to a theme.
 * Themes already render conditionally on these fields being truthy, so
 * blanking them is enough — no theme code changes required.
 */
export function applyVisibility(
  data: ActivityData,
  vis: Visibility
): ActivityData {
  return {
    ...data,
    athleteName: vis.athleteName ? data.athleteName : "",
    location: vis.location ? data.location : "",
    avgHeartRate: vis.heartRate ? data.avgHeartRate : undefined,
    splits: vis.splits ? data.splits : undefined,
  };
}
