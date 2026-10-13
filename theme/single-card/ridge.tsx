// RIDGE — the elevation profile becomes a second horizon across the photo.
// Above the line the photo is toned into the accent (a `color` blend layer),
// below it stays true; the title rides along the ridge on a textPath.
// Type: Instrument Serif (title, values) + IBM Plex Mono (captions).

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { formatDateUpper, formatNumber } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  DEFAULT_WOVEN_CONFIG,
  distanceMarks,
  metricsLevel,
  sampleProfile,
  smoothSeries,
  statLine,
  toPath,
  wovenProfile,
  wovenStats,
} from "@/lib/woven";
import type { WovenConfig } from "@/lib/woven";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { RIDGE_TINT } from "./default-accents";
import type { RidgeCapability } from "./ridge.theme";
import { Caption, Layer, StatColumns, WovenFrame } from "./woven-parts";
import { fallbackWash, SERIF, typeScale } from "./woven-style";

const SAMPLES = 160;
const WHITE = "#ffffff";

/** The ridge line: the profile laid across the full width, `base` at the
 *  lowest point, rising `amp` at the highest. */
const ridgeLine = (
  heights: number[],
  width: number,
  base: number,
  amp: number
): Coord[] =>
  heights.map((v, i) => [(i / (heights.length - 1)) * width, base - v * amp]);

export const ThemeRidge = ({
  colors,
  config = DEFAULT_WOVEN_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<RidgeCapability, WovenConfig>) => {
  const format = useFormat();
  const { width: W, height: H } = format;
  const insets = useSafeInsets({ bottom: 70, left: 70, right: 70, top: 70 });
  const k = typeScale(W, H);
  const uid = useId();
  const level = metricsLevel(config.metrics, format.id);
  const tint = colors?.primary ?? RIDGE_TINT;
  const stats = wovenStats(data);

  const profile = wovenProfile(data);
  const base = H * 0.52;
  const amp = H * 0.22;
  const heights = profile
    ? smoothSeries(sampleProfile(profile.pts, SAMPLES), 3)
    : Array.from({ length: SAMPLES }, () => 0.4);
  const ridge = ridgeLine(heights, W, base, amp);
  // The title follows a calmer copy of the ridge, so letters don't pile up on
  // short climbs.
  const titleRail = ridgeLine(smoothSeries(heights, 14), W, base, amp).map(
    ([x, y]): Coord => [x, y - 22 * k]
  );
  const above = `M0 0 L${W} 0 ${toPath(ridge.toReversed()).replace("M", "L")} Z`;

  let peak = 0;
  for (const [i, v] of heights.entries()) {
    if (v > heights[peak]) {
      peak = i;
    }
  }
  const peakPt = ridge[peak];
  const peakLabel =
    profile?.useElevation === true ? `↑ ${formatNumber(profile.max)} m` : null;
  const marks = profile ? distanceMarks(data.distanceKm, 4) : [];

  const meta = [formatDateUpper(data.date), data.location]
    .filter(hasText)
    .join(" · ");
  const shadeId = `${uid}-shade`;
  const railId = `${uid}-rail`;

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    >
      {/* Above the ridge: the photo toned into the accent hue… */}
      <Layer blend="color" label="Sky tone">
        <path d={above} fill={tint} opacity={0.85} />
      </Layer>
      <Layer label={data.title}>
        <defs>
          <linearGradient id={shadeId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
          <path d={toPath(titleRail)} id={railId} />
        </defs>
        {/* …and a touch darker, so the line and the title read. */}
        <path d={above} fill="#000" opacity={0.22} />
        <rect fill={`url(#${shadeId})`} height={H} width={W} />
        <path
          d={toPath(ridge)}
          fill="none"
          stroke={WHITE}
          strokeLinejoin="round"
          strokeWidth={2.5 * k}
        />
        <text
          fill={WHITE}
          style={{ fontFamily: SERIF, fontSize: 46 * k, fontStyle: "italic" }}
        >
          <textPath href={`#${railId}`} startOffset="4%">
            {data.title}
          </textPath>
        </text>

        {level !== "off" && peakLabel !== null ? (
          <g>
            <line
              stroke={WHITE}
              strokeWidth={1.5 * k}
              x1={peakPt[0]}
              x2={peakPt[0]}
              y1={peakPt[1] - 6 * k}
              y2={peakPt[1] - 70 * k}
            />
            <Caption
              anchor="middle"
              opacity={1}
              size={22 * k}
              x={Math.min(Math.max(peakPt[0], 120 * k), W - 120 * k)}
              y={peakPt[1] - 84 * k}
            >
              {peakLabel}
            </Caption>
          </g>
        ) : null}

        {level === "full"
          ? marks.map((km) => {
              const i = Math.round((km / data.distanceKm) * (SAMPLES - 1));
              const [x, y] = ridge[i];
              return (
                <g key={km}>
                  <line
                    opacity={0.8}
                    stroke={WHITE}
                    strokeWidth={1.5 * k}
                    x1={x}
                    x2={x}
                    y1={y + 8 * k}
                    y2={y + 24 * k}
                  />
                  <Caption anchor="middle" size={18 * k} x={x} y={y + 50 * k}>
                    {formatNumber(km, km % 1 === 0 ? 0 : 1)}
                  </Caption>
                </g>
              );
            })
          : null}

        {level === "full" ? (
          <StatColumns
            k={k}
            stats={stats}
            x={insets.left}
            y={H - insets.bottom - 70 * k}
          />
        ) : null}
        {level === "subtle" ? (
          <Caption
            opacity={0.95}
            size={24 * k}
            x={insets.left}
            y={H - insets.bottom - 46 * k}
          >
            {statLine(stats)}
          </Caption>
        ) : null}
        <Caption
          opacity={0.7}
          size={20 * k}
          x={insets.left}
          y={H - insets.bottom}
        >
          {meta}
        </Caption>
      </Layer>
    </WovenFrame>
  );
};
