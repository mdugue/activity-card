import type { ActivityData } from "@/components/app/sample-data";

export interface Visibility {
  athleteName: boolean;
  heartRate: boolean;
  location: boolean;
  splits: boolean;
}

export const DEFAULT_VISIBILITY: Visibility = {
  athleteName: true,
  location: true,
  heartRate: false,
  splits: true,
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
    athlete_name: vis.athleteName ? data.athlete_name : "",
    location: vis.location ? data.location : "",
    avg_heart_rate: vis.heartRate ? data.avg_heart_rate : undefined,
    splits: vis.splits ? data.splits : undefined,
  };
}
