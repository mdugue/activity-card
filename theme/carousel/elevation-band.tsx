// Global elevation/pace band for the seamless strip — the Ascent theme's
// signature. The profile is stretched across the full strip width (a mountain
// range that bleeds across every slide edge) with a filled gradient under the
// curve and a vertical exaggeration so flat-ish topography still reads.
// Optionally tags the highest and lowest points with a small dot + altitude.

import { useId } from "react";
import {
  type OverlayPath,
  sequencePaths,
  sequenceProfiles,
} from "@/lib/chart-helpers";
import type { ElevationColors } from "@/theme/carousel/theme-tokens";

interface ElevationBandProps {
  colors: ElevationColors;
  /** 1 ≈ 70% of the band height, capped at full */
  exaggeration?: number;
  h: number;
  /** dot + altitude label at the high/low points (elevation mode only) */
  markerColor?: string;
  markerFont?: string;
  markers?: boolean;
  mode?: "elevation" | "pace";
  profile: number[] | undefined;
  /** Multi-activity project: every leg's profile, laid out side by side on one
   *  shared scale (distance-weighted widths, no gaps). Overrides `profile`. */
  profiles?: number[][];
  w: number;
  /** Per-leg distances (index-aligned with `profiles`) → width weighting. */
  weights?: number[];
}

export function ElevationBand({
  profile,
  profiles,
  weights,
  w,
  h,
  colors,
  mode = "elevation",
  exaggeration = 1.1,
  markers = false,
  markerColor = "#ffffff",
  markerFont = "monospace",
}: ElevationBandProps) {
  const areaId = useId();

  // Multi-activity project: overlay every leg, sharing one vertical scale.
  if (profiles && profiles.length > 0) {
    const reach = Math.min(1, Math.max(0.3, 0.7 * exaggeration));
    const curves = sequenceProfiles(
      profiles,
      weights ?? profiles.map(() => undefined),
      mode === "elevation"
    );
    const paths = sequencePaths(curves, w, h, reach);
    if (paths.length === 0) {
      return null;
    }
    return (
      <MultiBand areaId={areaId} colors={colors} h={h} paths={paths} w={w} />
    );
  }

  if (!profile || profile.length < 2) {
    return null;
  }

  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const range = max - min || 1;
  const reach = Math.min(1, Math.max(0.3, 0.7 * exaggeration));
  // Pace is "lower = faster" — invert so faster reads as a higher peak.
  const norm = (v: number) =>
    mode === "pace" ? (max - v) / range : (v - min) / range;
  const step = w / (profile.length - 1);
  const pts = profile.map(
    (v, i) => [i * step, h - norm(v) * h * reach] as const
  );

  const line = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`
    )
    .join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;

  // Only tag distinct high/low points — a flat profile has no meaningful pair.
  const showMarkers = markers && mode === "elevation" && max > min;
  const maxIdx = profile.indexOf(max);
  const minIdx = profile.indexOf(min);
  const tags = showMarkers
    ? [
        { p: pts[maxIdx], value: max, above: true },
        { p: pts[minIdx], value: min, above: false },
      ]
    : [];
  const labelX = (x: number) => Math.min(Math.max(x, 90), w - 90);
  // The low point sits at y = h (the viewBox floor), so its "below" label would
  // fall outside the box and get clipped — keep every label inside the band.
  const labelY = (y: number, above: boolean) =>
    Math.min(Math.max(above ? y - 18 : y + 38, 30), h - 14);

  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
      viewBox={`0 0 ${w} ${h}`}
    >
      <title>{mode === "pace" ? "Pace profile" : "Elevation profile"}</title>
      <defs>
        <linearGradient id={areaId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={colors.fillFrom} stopOpacity={0.6} />
          <stop offset="100%" stopColor={colors.fillTo} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${areaId})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke={colors.line}
        strokeLinejoin="round"
        strokeWidth={4}
        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))" }}
      />

      {tags.map((t) => (
        <g
          key={t.above ? "peak" : "low"}
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
        >
          <circle cx={t.p[0]} cy={t.p[1]} fill={markerColor} r={6} />
          <text
            fill={markerColor}
            fontFamily={markerFont}
            fontSize={26}
            textAnchor="middle"
            x={labelX(t.p[0])}
            y={labelY(t.p[1], t.above)}
          >
            {`${Math.round(t.value)} m`}
          </text>
        </g>
      ))}
    </svg>
  );
}

// The sequenced-leg variant: each leg's profile laid out side by side along the
// width (shared scale), sharing one gradient fill. No high/low markers (they'd
// be ambiguous across legs on a shared scale).
function MultiBand({
  paths,
  w,
  h,
  colors,
  areaId,
}: {
  areaId: string;
  colors: ElevationColors;
  h: number;
  paths: OverlayPath[];
  w: number;
}) {
  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
      viewBox={`0 0 ${w} ${h}`}
    >
      <title>Elevation profiles</title>
      <defs>
        <linearGradient id={areaId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={colors.fillFrom} stopOpacity={0.55} />
          <stop offset="100%" stopColor={colors.fillTo} stopOpacity={0.04} />
        </linearGradient>
      </defs>
      {paths.map((p, i) => {
        const key = `band-${i}-${p.line}`;
        return (
          <g key={key}>
            <path d={p.area} fill={`url(#${areaId})`} stroke="none" />
            <path
              d={p.line}
              fill="none"
              stroke={colors.line}
              strokeLinejoin="round"
              strokeWidth={4}
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
