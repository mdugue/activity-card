// Optional "technical micro-graphic" layer (section 6): mono-typeset metadata
// (sport, date, origin coordinates, track point count) plus a tiny tick grid,
// tucked in a corner for instrument-panel depth. Off by default.

import type { ActivityData } from "@/components/app/sample-data";
import { buildMicroGraphic } from "@/lib/carousel/micro-graphic";
import type { FontPair } from "@/lib/carousel/theme-tokens";

type Corner = "br" | "tr";

const TICK_XS = Array.from({ length: 16 }, (_, i) => i * 6);

interface MicroGraphicLayerProps {
  color: string;
  corner?: Corner;
  data: ActivityData;
  fonts: FontPair;
}

function cornerStyle(corner: Corner): React.CSSProperties {
  // Right-aligned in a corner, clearing the meta band (top) / footer (bottom)
  // that the templates draw.
  const common: React.CSSProperties = {
    right: 90,
    textAlign: "right",
    alignItems: "flex-end",
  };
  if (corner === "tr") {
    return { ...common, top: 162 };
  }
  return { ...common, bottom: 156 };
}

export function MicroGraphicLayer({
  data,
  fonts,
  color,
  corner = "tr",
}: MicroGraphicLayerProps) {
  const lines = buildMicroGraphic(data);
  if (lines.length === 0) {
    return null;
  }
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontFamily: fonts.mono,
        fontSize: 15,
        letterSpacing: "0.08em",
        color,
        opacity: 0.72,
        ...cornerStyle(corner),
      }}
    >
      <svg height="10" style={{ marginBottom: 4 }} width="92">
        <title>tick grid</title>
        {TICK_XS.map((x) => (
          <line
            key={`tick-${x}`}
            stroke={color}
            strokeWidth={1}
            x1={x}
            x2={x}
            y1={x % 24 === 0 ? 0 : 4}
            y2={10}
          />
        ))}
      </svg>
      {lines.map((l) => (
        <div key={l.label} style={{ display: "flex", gap: 8 }}>
          <span style={{ opacity: 0.6 }}>{l.label}</span>
          <span>{l.value}</span>
        </div>
      ))}
    </div>
  );
}
