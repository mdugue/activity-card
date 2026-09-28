// Small path + altitude graphics for themes whose hero layer isn't already the
// route or the elevation range (Exposure's photo is the hero). Bare lines with
// mono labels — borderless, so they sit cleanly over the image.

import type { ActivityData } from "@/lib/activity";
import type { FontPair } from "@/theme/carousel/theme-tokens";

import { MiniViz } from "./mini-viz";
import { vizHasKind } from "./viz-kind";
import type { VizKind } from "./viz-kind";

interface DetailVizProps {
  color: string;
  data: ActivityData;
  fonts: FontPair;
  /** chart height (px) */
  h?: number;
  kinds: VizKind[];
  muted: string;
  /** chart width (px) */
  w?: number;
}

export const DetailViz = ({
  kinds,
  data,
  color,
  muted,
  fonts,
  w = 320,
  h = 132,
}: DetailVizProps) => {
  const present = kinds.filter((k) => vizHasKind(data, k));
  if (present.length === 0) {
    return null;
  }
  return (
    <div style={{ display: "flex", gap: 24 }}>
      {present.map((kind) => (
        <div key={kind}>
          <div
            style={{
              color: muted,
              fontFamily: fonts.mono,
              fontSize: 15,
              letterSpacing: "0.22em",
              marginBottom: 8,
            }}
          >
            {kind === "route" ? "ROUTE" : "PROFILE"}
          </div>
          <div style={{ height: h, width: w }}>
            <MiniViz color={color} data={data} h={h} kind={kind} w={w} />
          </div>
        </div>
      ))}
    </div>
  );
};
