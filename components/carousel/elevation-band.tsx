// Global elevation/pace band for the seamless strip — the Altitude theme's
// signature. The profile is stretched across the full strip width (a mountain
// range that bleeds across every slide edge) with a filled gradient under the
// curve and a vertical exaggeration so flat-ish topography still reads.

import { useId } from "react";
import type { ElevationColors } from "@/lib/carousel/theme-tokens";

interface ElevationBandProps {
  colors: ElevationColors;
  /** 1 ≈ 70% of the band height, capped at full */
  exaggeration?: number;
  h: number;
  mode?: "elevation" | "pace";
  profile: number[] | undefined;
  w: number;
}

export function ElevationBand({
  profile,
  w,
  h,
  colors,
  mode = "elevation",
  exaggeration = 1.1,
}: ElevationBandProps) {
  const areaId = useId();
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
    </svg>
  );
}
