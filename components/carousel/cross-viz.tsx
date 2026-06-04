// A small secondary visualisation shown on the wrap-up slide: the route gets a
// little elevation sparkline (Trace), the elevation themes get a little route
// glyph (Ascent / Exposure). Just enough to nod at the other dimension.

import type { ActivityData } from "@/components/app/sample-data";
import { pickProfile } from "@/lib/carousel/profile";
import type {
  CrossViz as CrossVizKind,
  FontPair,
} from "@/lib/carousel/theme-tokens";
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
  const { profile, mode } = pickProfile(data);
  const hasRoute = (data.routeCoordinates?.length ?? 0) > 1;
  const hasProfile = (profile?.length ?? 0) > 1;
  if (kind === "elevation" ? !hasProfile : !hasRoute) {
    return null;
  }

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
            mode={mode}
            profile={profile}
            w={w}
          />
        ) : (
          <RouteLine
            accent={accent}
            accent2={accent}
            coords={data.routeCoordinates}
            h={h}
            ink={color}
            pad={14}
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
