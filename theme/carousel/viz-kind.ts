// The mini-viz vocabulary shared by the carousel's secondary visualisations
// (DetailViz, CrossViz, Press's VizCard): which chart, and whether the activity
// has the data to draw it. Kept out of `mini-viz.tsx` so that module exports
// only components.

import type { ActivityData } from "@/lib/activity";
import {
  isMultiActivity,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";
import { pickProfile } from "@/theme/carousel/profile";

export type VizKind = "elevation" | "route";

/** Whether a route/elevation mini-viz has data to show, project-aware. */
export const vizHasKind = (data: ActivityData, kind: VizKind): boolean => {
  if (isMultiActivity(data)) {
    return kind === "route"
      ? segmentRoutes(data).length > 0
      : segmentProfiles(data).profiles.length > 0;
  }
  if (kind === "route") {
    return (data.routeCoordinates?.length ?? 0) > 1;
  }
  return pickProfile(data).signal !== "none";
};
