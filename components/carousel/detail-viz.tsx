// Small path + altitude graphics for themes whose hero layer isn't already the
// route or the elevation range (Exposure's photo is the hero). Bare lines with
// mono labels — borderless, so they sit cleanly over the image.

import type { ActivityData } from "@/components/app/sample-data";
import { pickProfile } from "@/lib/carousel/profile";
import type { FontPair } from "@/lib/carousel/theme-tokens";
import { ElevationBand } from "./elevation-band";
import { RouteLine } from "./route-line";

export type DetailVizKind = "elevation" | "route";

interface DetailVizProps {
  color: string;
  data: ActivityData;
  fonts: FontPair;
  /** chart height (px) */
  h?: number;
  kinds: DetailVizKind[];
  muted: string;
  /** chart width (px) */
  w?: number;
}

function hasKind(data: ActivityData, kind: DetailVizKind): boolean {
  if (kind === "route") {
    return (data.routeCoordinates?.length ?? 0) > 1;
  }
  return (pickProfile(data).profile?.length ?? 0) > 1;
}

function Chart({
  kind,
  data,
  color,
  w,
  h,
}: {
  color: string;
  data: ActivityData;
  h: number;
  kind: DetailVizKind;
  w: number;
}) {
  if (kind === "route") {
    return (
      <RouteLine
        accent={color}
        accent2={color}
        coords={data.routeCoordinates}
        h={h}
        ink={color}
        pad={10}
        showMarkers={false}
        strokeWidth={4}
        style="poster"
        w={w}
      />
    );
  }
  const { profile, mode } = pickProfile(data);
  return (
    <ElevationBand
      colors={{ line: color, fillFrom: color, fillTo: "transparent" }}
      h={h}
      mode={mode}
      profile={profile}
      w={w}
    />
  );
}

export function DetailViz({
  kinds,
  data,
  color,
  muted,
  fonts,
  w = 320,
  h = 132,
}: DetailVizProps) {
  const present = kinds.filter((k) => hasKind(data, k));
  if (present.length === 0) {
    return null;
  }
  return (
    <div style={{ display: "flex", gap: 24 }}>
      {present.map((kind) => (
        <div key={kind}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 15,
              letterSpacing: "0.22em",
              color: muted,
              marginBottom: 8,
            }}
          >
            {kind === "route" ? "ROUTE" : "PROFILE"}
          </div>
          <div style={{ width: w, height: h }}>
            <Chart color={color} data={data} h={h} kind={kind} w={w} />
          </div>
        </div>
      ))}
    </div>
  );
}
