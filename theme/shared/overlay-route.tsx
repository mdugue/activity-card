// Shared multi-activity route layer for the single-card themes. Projects every
// leg of a project into ONE shared coordinate system (combined bbox, uniform
// scale via `projectRoutes`) so the legs keep their true positions relative to
// one another, and strokes each in a caller-supplied colour (typically a ramp of
// the theme's accent). Styling levers (halo, markers, shadow) keep it adaptable
// to each theme's route treatment without re-implementing the projection.

import type { Coord } from "@/lib/activity";
import { projectRoutes } from "@/lib/chart-helpers";

interface OverlayRouteProps {
  /** One colour per route, index-aligned (e.g. `accentShades(accent, n)`). */
  colors: string[];
  h: number;
  /** Soft underlay drawn beneath every leg for legibility over a photo. */
  halo?: { color: string; width: number };
  markerRadius?: number;
  /** Dot at the start of each leg. */
  markers?: boolean;
  pad?: number;
  routes: Coord[][];
  /** CSS filter (drop-shadow) applied to each leg's line. */
  shadow?: string;
  strokeWidth?: number;
  w: number;
}

export function OverlayRoute({
  routes,
  w,
  h,
  pad = 0,
  colors,
  strokeWidth = 4,
  halo,
  markers = false,
  markerRadius = 8,
  shadow,
}: OverlayRouteProps) {
  if (routes.length === 0) {
    return null;
  }
  const projected = projectRoutes(routes, w, h, pad);
  return (
    <>
      {projected.map((pr, i) =>
        pr.d ? (
          <g key={`leg-${i}-${pr.d.length}`}>
            {halo ? (
              <path
                d={pr.d}
                fill="none"
                stroke={halo.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={halo.width}
              />
            ) : null}
            <path
              d={pr.d}
              fill="none"
              stroke={colors[i] ?? colors.at(-1) ?? "#000"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
              style={shadow ? { filter: shadow } : undefined}
            />
            {markers && pr.start ? (
              <circle
                cx={pr.start[0]}
                cy={pr.start[1]}
                fill={colors[i] ?? colors.at(-1) ?? "#000"}
                r={markerRadius}
              />
            ) : null}
          </g>
        ) : null
      )}
    </>
  );
}
