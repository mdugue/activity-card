// The shared small route/elevation chart used by the carousel's secondary
// visualisations — Exposure's detail slide (DetailViz), the standard wrap-up
// nod (CrossViz) and Press's clipping card (VizCard). All three select the same
// multi-activity-aware route-or-elevation chart and gate it on the same
// presence check; only the surrounding layout + a few knobs differ.

import type { ActivityData } from "@/lib/activity";
import {
  isMultiActivity,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";
import { bandModeFor, pickProfile } from "@/theme/carousel/profile";

import { ElevationBand } from "./elevation-band";
import { RouteLine } from "./route-line";
import type { VizKind } from "./viz-kind";

interface MiniVizProps {
  /** tints the route gradient; defaults to `color` */
  accent?: string;
  /** the line / ink colour */
  color: string;
  data: ActivityData;
  /** elevation vertical exaggeration (undefined → ElevationBand's default) */
  exaggeration?: number;
  h: number;
  kind: VizKind;
  pad?: number;
  showMarkers?: boolean;
  w: number;
}

/** One small route or elevation chart in a theme ink. */
export const MiniViz = ({
  kind,
  data,
  w,
  h,
  color,
  accent = color,
  pad = 10,
  exaggeration,
  showMarkers = false,
}: MiniVizProps) => {
  const multi = isMultiActivity(data);
  if (kind === "route") {
    return (
      <RouteLine
        accent={accent}
        accent2={accent}
        coords={data.routeCoordinates}
        h={h}
        ink={color}
        pad={pad}
        routes={multi ? segmentRoutes(data).map((r) => r.coords) : undefined}
        showMarkers={showMarkers}
        strokeWidth={4}
        routeStyle="poster"
        w={w}
      />
    );
  }
  const { profile, mode } = pickProfile(data);
  const seg = multi ? segmentProfiles(data) : null;
  return (
    <ElevationBand
      colors={{ fillFrom: color, fillTo: "transparent", line: color }}
      exaggeration={exaggeration}
      h={h}
      mode={bandModeFor(seg, mode)}
      profile={profile}
      profiles={multi ? seg?.profiles : undefined}
      w={w}
      weights={multi ? seg?.distances : undefined}
    />
  );
};
