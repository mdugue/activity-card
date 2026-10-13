// LIGHT TRAIL — the route laid onto the ground of the photo in perspective,
// glowing like a long exposure. Colour and glow follow the effort: fast
// stretches burn bright. The photo is drained towards night (a `saturation`
// layer plus a dark veil) so the trail is the only colour left.
// Type: Instrument Serif (title, values) + IBM Plex Mono (captions).

import type { Coord } from "@/lib/activity";
import { mixHex } from "@/lib/chart-helpers";
import { formatDateUpper, formatNumber } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  distanceMarks,
  metricsLevel,
  wovenIntensity,
  wovenRoutePoints,
  wovenStats,
} from "@/lib/woven";
import { DEFAULT_LIGHT_TRAIL_CONFIG } from "@/lib/woven-themes";
import type { LightTrailConfig } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { LIGHT_TRAIL_FAST, LIGHT_TRAIL_SLOW } from "./default-accents";
import type { LightTrailCapability } from "./light-trail.theme";
import { Caption, Layer, Title, WovenFrame } from "./woven-parts";
import { fallbackWash, typeScale } from "./woven-style";

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

  const ground = wovenRoutePoints(data, GROUND, GROUND);
  // Keep the near edge of the trail clear of the title block.
  const horizon = (H * config.horizon) / 100;
  const near = Math.max(horizon + 80 * k, H - insets.bottom - 150 * k);
  const trail = perspective(ground, W, horizon, near);
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
    return {
      a,
      b,
      color: mixHex(slow, fast, heat(i + 1)),
      w: (22 * k) / ((a.z + b.z) / 2),
    };
  });
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
      photoUrl={photoUrl}
    >
      <Layer blend="saturation" label="Night">
        <rect fill="#808080" height={H} opacity={0.8} width={W} />
      </Layer>
      <Layer label={data.title}>
        <rect fill="#05060a" height={H} opacity={0.38} width={W} />
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
