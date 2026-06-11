// A small secondary visualisation shown on the wrap-up slide: the route gets a
// little elevation sparkline (Trace), the elevation themes get a little route
// glyph (Ascent / Exposure). Just enough to nod at the other dimension.

import type { ActivityData } from "@/lib/activity";
import { bandModeFor, pickProfile } from "@/lib/carousel/profile";
import type {
  CrossViz as CrossVizKind,
  FontPair,
} from "@/lib/carousel/theme-tokens";
import {
  isMultiActivity,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";
import { ElevationBand } from "./elevation-band";
import { RouteLine } from "./route-line";

interface CrossVizProps {
  accent: string;
  color: string;
  data: ActivityData;
  fonts: FontPair;
  /** chart height (px) */
  h?: number;
  kind: CrossVizKind;
  muted: string;
  /** chart width (px) */
  w?: number;
}

/** Whether the wrap-up nod has data to show, project-aware. */
function hasCross(data: ActivityData, kind: CrossVizKind): boolean {
  if (isMultiActivity(data)) {
    return kind === "elevation"
      ? segmentProfiles(data).profiles.length > 0
      : segmentRoutes(data).length > 0;
  }
  if (kind === "elevation") {
    return (pickProfile(data).profile?.length ?? 0) > 1;
  }
  return (data.routeCoordinates?.length ?? 0) > 1;
}

export function CrossViz({
  kind,
  data,
  color,
  muted,
  accent,
  fonts,
  w = 260,
  h = 150,
}: CrossVizProps) {
  if (!hasCross(data, kind)) {
    return null;
  }
  const { profile, mode } = pickProfile(data);
  const multi = isMultiActivity(data);
  const seg = multi ? segmentProfiles(data) : null;
  const routes = multi ? segmentRoutes(data) : [];
  const bandMode = bandModeFor(seg, mode);

  return (
    <div style={{ width: w }}>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 15,
          letterSpacing: "0.2em",
          color: muted,
          marginBottom: 6,
        }}
      >
        {kind === "elevation" ? "PROFILE" : "ROUTE"}
      </div>
      <div style={{ width: w, height: h }}>
        {kind === "elevation" ? (
          <ElevationBand
            colors={{ line: color, fillFrom: color, fillTo: "transparent" }}
            exaggeration={1.2}
            h={h}
            mode={bandMode}
            profile={profile}
            profiles={multi ? seg?.profiles : undefined}
            w={w}
            weights={multi ? seg?.distances : undefined}
          />
        ) : (
          <RouteLine
            accent={accent}
            accent2={accent}
            coords={data.routeCoordinates}
            h={h}
            ink={color}
            pad={14}
            routes={multi ? routes.map((r) => r.coords) : undefined}
            showMarkers={false}
            strokeWidth={4}
            style="poster"
            w={w}
          />
        )}
      </div>
    </div>
  );
}
