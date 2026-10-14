// LIGHT TRAIL — the route laid onto the ground of the photo in perspective,
// glowing like a long exposure. Speed is drawn twice: in the trail's colour
// (slow embers → fast white light) and as a curtain of light rising off it,
// tall where the activity was fast — its skyline is the speed profile. A small
// legend names both ends. The photo is pressed towards night (a colour filter
// on the photo itself) so the light is the only colour left.
// Type: Instrument Serif (title, values) + IBM Plex Mono (captions).

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { artPlacement, boundsCentre, placePoints } from "@/lib/art-placement";
import { mixHex } from "@/lib/chart-helpers";
import { formatDateUpper, formatNumber } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  distanceMarks,
  metricsLevel,
  resampleRoute,
  scrimStrength,
  wovenIntensity,
  wovenRoutePoints,
  wovenSpeedRange,
  wovenStats,
} from "@/lib/woven";
import { DEFAULT_LIGHT_TRAIL_CONFIG } from "@/lib/woven-themes";
import type { LightTrailConfig } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { LIGHT_TRAIL_FAST, LIGHT_TRAIL_SLOW } from "./default-accents";
import type { LightTrailCapability } from "./light-trail.theme";
import { Caption, Layer, TextScrim, Title, WovenFrame } from "./woven-parts";
import { fallbackWash, MONO, typeScale } from "./woven-style";

const GROUND = 1000;
/** Depth of the route's nearest and farthest edge (camera units). */
const NEAR = 0.88;
const DEPTH = 2.3;
/** Half-width of the route on the ground, relative to its box. */
const SPREAD = 1.35;

interface TrailPoint {
  x: number;
  y: number;
  /** depth — strokes thin out with distance */
  z: number;
}

/** Lay the (uniformly projected) route flat on the ground plane and look at
 *  it through a pinhole camera: x across, the route's top edge farthest away,
 *  its nearest edge landing on `near` (a canvas y below the horizon). */
const perspective = (
  pts: Coord[],
  width: number,
  horizon: number,
  near: number
): TrailPoint[] => {
  const focal = (near - horizon) * NEAR;
  const across = width * 0.48;
  return pts.map(([gx, gy]) => {
    const x = ((gx - GROUND / 2) / (GROUND / 2)) * SPREAD;
    const z = NEAR + (1 - gy / GROUND) * DEPTH;
    return { x: width / 2 + (across * x) / z, y: horizon + focal / z, z };
  });
};

/** Points the trail is resampled to — even spacing, so segment i sits at
 *  i/TRAIL_POINTS of the distance. */
const TRAIL_POINTS = 260;
/** The night filter on the photo; `dim` (0…1) sets how deep the night. */
const night = (dim: number): string =>
  `saturate(${(1 - dim).toFixed(3)}) brightness(${(1 - 0.72 * dim).toFixed(3)}) contrast(${(1 + 0.17 * dim).toFixed(3)})`;

/** Lay the trail where the user placed it (drag / pinch on the card): moved
 *  and scaled about its own centre, depth kept for the stroke widths. */
const placeTrail = (
  trail: TrailPoint[],
  place: ReturnType<typeof artPlacement>
): TrailPoint[] => {
  const flat = trail.map((p): Coord => [p.x, p.y]);
  const moved = placePoints(flat, place, boundsCentre(flat, [0, 0]));
  return trail.map((p, i) => ({ ...p, x: moved[i][0], y: moved[i][1] }));
};
/** The curtain's colours, quantised: one upward-fading gradient per step
 *  of speed (a gradient can't take its colour from the shape using it). */
const BUCKETS = Array.from({ length: 10 }, (_, i) => i);

/** Glow passes, widest first: stroke-width factor and opacity. */
const PASSES = [
  { opacity: 0.12, width: 3.4 },
  { opacity: 0.28, width: 1.9 },
  { opacity: 1, width: 1 },
] as const;

export const ThemeLightTrail = ({
  colors,
  config = DEFAULT_LIGHT_TRAIL_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<LightTrailCapability, LightTrailConfig>) => {
  const format = useFormat();
  const { width: W, height: H } = format;
  const insets = useSafeInsets({ bottom: 70, left: 70, right: 70, top: 70 });
  const k = typeScale(W, H);
  const level = metricsLevel(config.metrics, format.id);
  const slow = colors?.primary ?? LIGHT_TRAIL_SLOW;
  const fast = colors?.secondary ?? LIGHT_TRAIL_FAST;
  const stats = wovenStats(data);
  const [distance, time] = stats;
  const third = stats.at(2);

  const ground = resampleRoute(
    wovenRoutePoints(data, GROUND, GROUND),
    TRAIL_POINTS
  );
  // Keep the near edge of the trail clear of the title block.
  const horizon = (H * config.horizon) / 100;
  const near = Math.max(horizon + 80 * k, H - insets.bottom - 190 * k);
  const place = artPlacement(config, W, H);
  const trail = placeTrail(perspective(ground, W, horizon, near), place);
  const dim = config.dim / 100;
  const intensity = wovenIntensity(data);
  const heat = (i: number): number => {
    if (!intensity) {
      return i / Math.max(1, trail.length - 1);
    }
    const at = Math.floor((i / trail.length) * intensity.length);
    return intensity[Math.min(at, intensity.length - 1)];
  };
  const segments = trail.slice(1).map((b, i) => {
    const a = trail[i];
    const h = heat(i + 1);
    return {
      a,
      b,
      color: mixHex(slow, fast, h),
      h,
      w: ((16 + 12 * h) * k * place.scale) / ((a.z + b.z) / 2),
    };
  });
  // The curtain: as tall as the speed, foreshortened with depth; drawn far
  // to near so nearer light sits in front.
  const curtainH = (H * 0.36 * config.curtain * place.scale) / 100;
  const lift = (h: number, z: number) =>
    (curtainH * (0.14 + 0.86 * h) * NEAR) / z;
  const curtain = segments.toSorted((p, q) => q.a.z - p.a.z);
  const range = wovenSpeedRange(data);
  const uid = useId();
  const legendId = `${uid}-legend`;
  const scrimId = `${uid}-scrim`;
  const curtainId = `${uid}-curtain`;
  const marks =
    level === "full" && trail.length > 1
      ? distanceMarks(data.distanceKm, 4)
      : [];
  const meta = [formatDateUpper(data.date), data.location]
    .filter(hasText)
    .join(" · ");
  const start = trail.at(0);

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoFilter={night(dim)}
      photoUrl={photoUrl}
    >
      {curtainH > 0 ? (
        <Layer blend="screen" label="Speed">
          <defs>
            {BUCKETS.map((b) => (
              <linearGradient
                id={`${curtainId}-${b}`}
                key={b}
                x1="0"
                x2="0"
                y1="1"
                y2="0"
              >
                <stop
                  offset="0"
                  stopColor={mixHex(slow, fast, b / (BUCKETS.length - 1))}
                  stopOpacity="0.62"
                />
                <stop
                  offset="0.3"
                  stopColor={mixHex(slow, fast, b / (BUCKETS.length - 1))}
                  stopOpacity="0.24"
                />
                <stop
                  offset="1"
                  stopColor={mixHex(slow, fast, b / (BUCKETS.length - 1))}
                  stopOpacity="0"
                />
              </linearGradient>
            ))}
          </defs>
          {curtain.map((s) => (
            <polygon
              fill={`url(#${curtainId}-${Math.round(s.h * (BUCKETS.length - 1))})`}
              key={`${s.a.x}-${s.a.y}`}
              points={[
                `${s.a.x},${s.a.y}`,
                `${s.b.x},${s.b.y}`,
                `${s.b.x},${s.b.y - lift(s.h, s.b.z)}`,
                `${s.a.x},${s.a.y - lift(s.h, s.a.z)}`,
              ].join(" ")}
            />
          ))}
        </Layer>
      ) : null}
      <Layer label={data.title}>
        <TextScrim id={scrimId} strength={scrimStrength(dim, 0.7)} />
        {PASSES.map((pass) => (
          <g key={pass.width} opacity={pass.opacity}>
            {segments.map((s) => (
              <line
                key={`${s.a.x}-${s.a.y}`}
                stroke={
                  pass.width === 1 ? mixHex(s.color, "#ffffff", 0.35) : s.color
                }
                strokeLinecap="round"
                strokeWidth={s.w * pass.width}
                x1={s.a.x}
                x2={s.b.x}
                y1={s.a.y}
                y2={s.b.y}
              />
            ))}
          </g>
        ))}
        {start ? (
          <circle cx={start.x} cy={start.y} fill="#ffffff" r={7 * k} />
        ) : null}

        {marks.map((km) => {
          const p =
            trail[Math.round((km / data.distanceKm) * (trail.length - 1))];
          return (
            <g key={km}>
              <circle cx={p.x} cy={p.y} fill="#ffffff" r={3 * k} />
              <Caption
                opacity={0.9}
                size={(28 * k) / p.z}
                x={p.x + 12 * k}
                y={p.y - 10 * k}
              >
                {`km ${formatNumber(km, km % 1 === 0 ? 0 : 1)}`}
              </Caption>
            </g>
          );
        })}

        {level === "off" ? null : (
          <g>
            <Title size={86 * k} x={insets.left} y={insets.top + 70 * k}>
              {`${distance.value} ${distance.unit}`}
            </Title>
            <Caption
              size={22 * k}
              x={insets.left + 2 * k}
              y={insets.top + 116 * k}
            >
              {`in ${time.value}`}
            </Caption>
          </g>
        )}
        {level === "full" && third !== undefined ? (
          <g>
            <Title
              anchor="end"
              size={86 * k}
              x={W - insets.right}
              y={insets.top + 70 * k}
            >
              {third.value}
            </Title>
            <Caption
              anchor="end"
              size={22 * k}
              x={W - insets.right}
              y={insets.top + 116 * k}
            >
              {`${third.unit} ${third.label}`}
            </Caption>
          </g>
        ) : null}

        {level !== "off" && range !== null ? (
          <g
            style={{ fontFamily: MONO, fontSize: 16 * k, letterSpacing: 3 * k }}
          >
            <defs>
              <linearGradient id={legendId} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor={slow} />
                <stop offset="1" stopColor={mixHex(fast, "#ffffff", 0.35)} />
              </linearGradient>
            </defs>
            <text
              fill="#ffffff"
              opacity={0.8}
              textAnchor="end"
              x={W / 2 - 90 * k}
              y={H - insets.bottom - 120 * k}
            >
              {`SLOW ${range.slow}`}
            </text>
            <rect
              fill={`url(#${legendId})`}
              height={3 * k}
              rx={1.5 * k}
              width={160 * k}
              x={W / 2 - 80 * k}
              y={H - insets.bottom - 126 * k}
            />
            <text
              fill="#ffffff"
              opacity={0.8}
              x={W / 2 + 90 * k}
              y={H - insets.bottom - 120 * k}
            >
              {`${range.fast} ${range.unit.toUpperCase()} FAST`}
            </text>
          </g>
        ) : null}
        <Title
          anchor="middle"
          italic
          size={58 * k}
          x={W / 2}
          y={H - insets.bottom - 44 * k}
        >
          {data.title}
        </Title>
        <Caption
          anchor="middle"
          opacity={0.7}
          size={20 * k}
          x={W / 2}
          y={H - insets.bottom}
        >
          {meta}
        </Caption>
      </Layer>
    </WovenFrame>
  );
};
