// Carousel route layer (section 5). Rounded caps/joins, subtle drop-shadow,
// start-green / end-red white-ringed markers. Three styles: poster (silhouette
// in theme ink), desaturated (saturated accent line meant to sit over a
// desaturated photo), highlighter (accent→accent2 gradient along the line).
// Fills whatever box it's given, so the seamless canvas can hand it a wide
// viewBox and the line bleeds across slide edges.

import { useId } from "react";
import type { Coord } from "@/components/app/sample-data";
import type { RouteStyle } from "@/lib/carousel/types";
import { projectRoute } from "@/lib/chart-helpers";

const START = "#1f9d57";
const END = "#e23b2e";

interface RouteLineProps {
  accent: string;
  accent2: string;
  coords: Coord[] | undefined;
  h: number;
  ink: string;
  /** stronger shadow + white markers for legibility over a photo */
  overPhoto?: boolean;
  pad?: number;
  showMarkers?: boolean;
  /** fill the box on both axes (seamless strip) instead of preserving aspect */
  stretch?: boolean;
  strokeWidth?: number;
  style: RouteStyle;
  w: number;
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
  const { d, start, end } = projectRoute(coords, w, h, pad, stretch);
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

  const markerR = Math.max(7, strokeWidth * 1.6);

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

      {showMarkers && start && end ? (
        <g>
          <circle
            cx={start[0]}
            cy={start[1]}
            fill={START}
            r={markerR}
            stroke="#ffffff"
            strokeWidth={markerR * 0.45}
          />
          <circle
            cx={end[0]}
            cy={end[1]}
            fill={END}
            r={markerR}
            stroke="#ffffff"
            strokeWidth={markerR * 0.45}
          />
        </g>
      ) : null}
    </svg>
  );
}
