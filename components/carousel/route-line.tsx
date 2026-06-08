// Carousel route layer. Rounded caps/joins, a subtle drop-shadow, and a small,
// understated direction arrow at the *start* of the line (no coloured GPS pins,
// no finish flag — just a hint of which way the effort went). Three styles:
// poster (silhouette in theme ink), desaturated (accent over a desaturated
// photo), highlighter (accent→accent2 gradient). The route is always projected
// aspect-preserving and centred in the box it's given (never stretched to fill
// it), so its silhouette stays geographically faithful.

import { useId } from "react";
import type { Coord } from "@/components/app/sample-data";
import type { RouteStyle } from "@/lib/carousel/types";
import {
  accentShades,
  mixHex,
  projectRoute,
  projectRoutes,
} from "@/lib/chart-helpers";

interface RouteLineProps {
  accent: string;
  accent2: string;
  coords: Coord[] | undefined;
  h: number;
  ink: string;
  /** stronger shadow for legibility over a photo */
  overPhoto?: boolean;
  pad?: number;
  /** Multi-activity project: every leg's route, drawn in one shared coordinate
   *  system and tinted along an accent2→accent ramp. Overrides `coords`. */
  routes?: Coord[][];
  showMarkers?: boolean;
  strokeWidth?: number;
  style: RouteStyle;
  w: number;
}

/** A small arrowhead at the first point, oriented along the initial heading —
 *  a quiet "started here, went this way" cue. */
function StartArrow({
  points,
  size,
  color,
}: {
  color: string;
  points: Coord[];
  size: number;
}) {
  if (points.length < 2) {
    return null;
  }
  const [sx, sy] = points[0];
  // Look a little down the line for a stable heading (skip jitter at the start).
  let [ax, ay] = points[1];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - sx;
    const dy = points[i][1] - sy;
    if (Math.hypot(dx, dy) > size * 1.6) {
      ax = points[i][0];
      ay = points[i][1];
      break;
    }
  }
  const angle = (Math.atan2(ay - sy, ax - sx) * 180) / Math.PI;
  const len = size;
  const half = size * 0.6;
  const tri = `${len},0 ${-len * 0.45},${-half} ${-len * 0.45},${half}`;
  return (
    <g transform={`translate(${sx} ${sy}) rotate(${angle})`}>
      <polygon fill={color} opacity={0.9} points={tri} />
    </g>
  );
}

export function RouteLine({
  coords,
  routes,
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
}: RouteLineProps) {
  const gradId = useId();

  const shadow = overPhoto
    ? "drop-shadow(0 2px 12px rgba(0,0,0,0.55))"
    : "drop-shadow(0 3px 8px rgba(0,0,0,0.18))";
  const arrowSize = Math.max(9, strokeWidth * 2.1);

  // Multi-activity project: overlay every leg in one shared coordinate system.
  if (routes && routes.length > 0) {
    const projected = projectRoutes(routes, w, h, pad);
    if (!projected.some((p) => p.d)) {
      return null;
    }
    // Distinguish the legs by colour. When the caller gives two distinct accents
    // (the route hero), ramp between them; when it passes a single colour (the
    // detail / cross-viz / panel glyphs), ramp that colour's own shades so the
    // legs still read apart at small sizes.
    let cols: string[];
    if (routes.length <= 1) {
      cols = [accent];
    } else if (accent === accent2) {
      cols = accentShades(accent, routes.length);
    } else {
      cols = routes.map((_, i) =>
        mixHex(accent2, accent, i / (routes.length - 1))
      );
    }
    const lead = projected.find((p) => p.points.length > 1);
    return (
      <svg
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
        viewBox={`0 0 ${w} ${h}`}
      >
        <title>Routes</title>
        {projected.map((pr, i) => {
          if (!pr.d) {
            return null;
          }
          const key = `leg-${i}-${pr.d}`;
          return (
            <g key={key}>
              {style === "poster" && !overPhoto ? (
                <path
                  d={pr.d}
                  fill="none"
                  stroke={ink}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.08}
                  strokeWidth={strokeWidth * 3.5}
                />
              ) : null}
              <path
                d={pr.d}
                fill="none"
                stroke={cols[i]}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
                style={{ filter: shadow }}
              />
            </g>
          );
        })}
        {showMarkers && lead ? (
          <g style={{ filter: shadow }}>
            <StartArrow color={ink} points={lead.points} size={arrowSize} />
          </g>
        ) : null}
      </svg>
    );
  }

  const { d, points } = projectRoute(coords, w, h, pad);
  if (!d) {
    return null;
  }

  let stroke = ink;
  if (style === "highlighter") {
    stroke = `url(#${gradId})`;
  } else if (style === "desaturated") {
    stroke = accent;
  }

  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
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

      {showMarkers ? (
        <g style={{ filter: shadow }}>
          <StartArrow color={ink} points={points} size={arrowSize} />
        </g>
      ) : null}
    </svg>
  );
}
