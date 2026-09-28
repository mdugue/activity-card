// A small secondary visualisation shown on the wrap-up slide: the route gets a
// little elevation sparkline (Trace), the elevation themes get a little route
// glyph (Ascent / Exposure). Just enough to nod at the other dimension.

import type { ActivityData } from "@/lib/activity";

export const CrossViz = ({
  kind,
  data,
  color,
  muted,
  accent,
  fonts,
  w = 260,
  h = 150,
}: CrossVizProps) => {
  if (!vizHasKind(data, kind)) {
    return null;
  }
  return (
    <div style={{ width: w }}>
      <div
        style={{
          color: muted,
          fontFamily: fonts.mono,
          fontSize: 15,
          letterSpacing: "0.2em",
          marginBottom: 6,
        }}
      >
        {kind === "elevation" ? "PROFILE" : "ROUTE"}
      </div>
      <div style={{ height: h, width: w }}>
        <MiniViz
          accent={accent}
          color={color}
          data={data}
          exaggeration={1.2}
          h={h}
          kind={kind}
          pad={14}
          w={w}
        />
      </div>
    </div>
  );
};
import type {
  CrossViz as CrossVizKind,
  FontPair,
} from "@/theme/carousel/theme-tokens";

import { MiniViz, vizHasKind } from "./mini-viz";

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
