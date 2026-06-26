// Small path + altitude graphics for themes whose hero layer isn't already the
// route or the elevation range (Exposure's photo is the hero). Bare lines with
// mono labels — borderless, so they sit cleanly over the image.

import type { ActivityData } from "@/lib/activity";
import type { FontPair } from "@/theme/carousel/theme-tokens";
import { MiniViz, type VizKind, vizHasKind } from "./mini-viz";

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

export function DetailViz({
  kinds,
  data,
  color,
  muted,
  fonts,
  w = 320,
  h = 132,
}: DetailVizProps) {
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
            <MiniViz color={color} data={data} h={h} kind={kind} w={w} />
          </div>
        </div>
      ))}
    </div>
  );
}
