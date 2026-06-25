import { interpolate, useCurrentFrame } from "remotion";
import { type Coord, routePath } from "@/lib/chart-helpers";
import { EASE_PANEL, RUST_BRIGHT } from "../design/tokens";

/**
 * A route silhouette drawing itself in — the brand's "your path is the art"
 * gesture. Uses the app's own aspect-preserving projection (`routePath`), so
 * the silhouette is geographically faithful, never stretched.
 */
export function RouteDraw({
  coords,
  delay = 0,
  durationInFrames = 50,
  height,
  stroke = RUST_BRIGHT,
  strokeWidth = 7,
  width,
}: {
  coords: Coord[] | undefined;
  delay?: number;
  durationInFrames?: number;
  height: number;
  stroke?: string;
  strokeWidth?: number;
  width: number;
}) {
  const frame = useCurrentFrame();
  const draw = interpolate(frame - delay, [0, durationInFrames], [0, 1], {
    easing: EASE_PANEL,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const d = routePath(coords, width, height, strokeWidth * 2);
  return (
    <svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
      <title>Route</title>
      <path
        d={d}
        fill="none"
        pathLength={100}
        stroke={stroke}
        strokeDasharray={100}
        strokeDashoffset={100 - draw * 100}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
