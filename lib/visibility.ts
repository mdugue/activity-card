import type { ActivityData } from "@/components/app/sample-data";

export interface Visibility {
  athleteName: boolean;
  heartRate: boolean;
  location: boolean;
  photoBackdrop: boolean;
  /** carousel: print the "made with effort" mark on the wrap-up slide */
  showEffort: boolean;
  /** carousel: print the "01 / 04" slide index on every slide */
  showPageNumber: boolean;
  splits: boolean;
}

export const DEFAULT_VISIBILITY: Visibility = {
  // The athlete's name is personal; keep it off until the user opts in.
  athleteName: false,
  location: true,
  heartRate: true,
  splits: true,
  photoBackdrop: true,
  // Carousel chrome — off by default so a deck reads as a clean art piece.
  showEffort: false,
  showPageNumber: false,
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
