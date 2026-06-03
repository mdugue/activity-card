// Carousel route layer. Rounded caps/joins, a subtle drop-shadow, and a single
// graphic finish marker — a checkered flag at the end of the line (no coloured
// start/end dots; they read as generic GPS pins). Three styles: poster
// (silhouette in theme ink), desaturated (accent line over a desaturated photo),
// highlighter (accent→accent2 gradient). Fills whatever box it's given, so the
// seamless canvas can hand it a wide viewBox and the line bleeds across edges.

import { useId } from "react";
import type { Coord } from "@/components/app/sample-data";
import type { RouteStyle } from "@/lib/carousel/types";
import { projectRoute } from "@/lib/chart-helpers";

interface RouteLineProps {
  accent: string;
  accent2: string;
  coords: Coord[] | undefined;
  h: number;
  ink: string;
  /** stronger shadow for legibility over a photo */
  overPhoto?: boolean;
  pad?: number;
  showMarkers?: boolean;
  /** fill the box on both axes (seamless strip) instead of preserving aspect */
  stretch?: boolean;
  strokeWidth?: number;
  style: RouteStyle;
  w: number;
}

/** A small checkered finish flag anchored at the end point. Monochrome (filled
 *  squares in `color`, gaps transparent) so it reads as a checker on any
 *  background and matches the theme ink. */
function FinishFlag({
  x,
  y,
  unit,
  color,
}: {
  color: string;
  unit: number;
  x: number;
  y: number;
}) {
  const cols = 3;
  const rows = 2;
  const flagW = cols * unit;
  const flagH = rows * unit;
  const poleH = flagH + unit * 1.6;
  const top = y - poleH;
  const squares: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) {
        squares.push(
          <rect
            height={unit}
            key={`${r}-${c}`}
            width={unit}
            x={x + c * unit}
            y={top + r * unit}
          />
        );
      }
    }
  }
  return (
    <g fill={color} stroke="none">
      {/* pole */}
      <rect
        height={poleH}
        width={Math.max(2, unit * 0.32)}
        x={x - Math.max(2, unit * 0.32)}
        y={top}
      />
      {/* checker field outline keeps the empty squares legible */}
      <rect
        fill="none"
        height={flagH}
        stroke={color}
        strokeWidth={Math.max(1, unit * 0.18)}
        width={flagW}
        x={x}
        y={top}
      />
      {squares}
    </g>
  );
}

export function RouteLine({
  coords,
  w,
  h,
  pad = 80,
  style,
  accent,
  accent2,
  ink,
  overPhoto = false,
  strokeWidth = 7,
  showMarkers = true,
  stretch = false,
}: RouteLineProps) {
  const gradId = useId();
  const { d, end } = projectRoute(coords, w, h, pad, stretch);
  if (!d) {
    return null;
  }

  let stroke = ink;
  if (style === "highlighter") {
    stroke = `url(#${gradId})`;
  } else if (style === "desaturated") {
    stroke = accent;
  }

  const shadow = overPhoto
    ? "drop-shadow(0 2px 12px rgba(0,0,0,0.55))"
    : "drop-shadow(0 3px 8px rgba(0,0,0,0.18))";

  const flagUnit = Math.max(6, strokeWidth * 1.5);

  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}
      style={{ width: "100%", height: "100%", display: "block" }}
      viewBox={`0 0 ${w} ${h}`}
    >
      <title>Route</title>
      {style === "highlighter" ? (
        <defs>
          <linearGradient id={gradId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={accent2} />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
        </defs>
      ) : null}

      {/* Soft underlay for poster mode — gives the line weight on paper. */}
      {style === "poster" && !overPhoto ? (
        <path
          d={d}
          fill="none"
          stroke={ink}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.08}
          strokeWidth={strokeWidth * 3.5}
        />
      ) : null}

      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={style === "highlighter" ? strokeWidth * 1.4 : strokeWidth}
        style={{ filter: shadow }}
      />

      {showMarkers && end ? (
        <g style={{ filter: shadow }}>
          <FinishFlag color={ink} unit={flagUnit} x={end[0]} y={end[1]} />
        </g>
      ) : null}
    </svg>
  );
}
