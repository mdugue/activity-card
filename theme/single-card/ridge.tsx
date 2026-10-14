// RIDGE — the elevation profile becomes a second horizon across the photo.
// Above the line the photo is toned (an accent duotone, black and white or
// night), below it stays true; the title rides along the ridge. The ridge can
// be moved, scaled and tilted to sit on the photo's own horizon.
// The toned sky is a second, clipped copy of the photo with a colour filter
// (plus a `multiply` tint for the duotone), so the iOS export rebuilds it.
// Type: Instrument Serif (title, values) + IBM Plex Mono (captions).

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { mixHex } from "@/lib/chart-helpers";
import { formatDateUpper, formatNumber } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  distanceMarks,
  metricsLevel,
  sampleProfile,
  smoothSeries,
  statLine,
  toPath,
  wovenProfile,
  wovenStats,
} from "@/lib/woven";
import { DEFAULT_RIDGE_CONFIG } from "@/lib/woven-themes";
import type { RidgeConfig, RidgeTone } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { RIDGE_TINT } from "./default-accents";
import type { RidgeCapability } from "./ridge.theme";
import {
  Caption,
  Layer,
  PhotoCopy,
  StatColumns,
  WovenFrame,
} from "./woven-parts";
import { fallbackWash, SERIF, typeScale } from "./woven-style";

const SAMPLES = 180;
const WHITE = "#ffffff";

/** The colour filter of the sky copy, per tone. */
const SKY_FILTER: Record<RidgeTone, string> = {
  duotone: "grayscale(1) contrast(1.12) brightness(1.12)",
  mono: "grayscale(1) contrast(1.18) brightness(0.98)",
  night: "grayscale(0.85) brightness(0.5) contrast(1.1)",
};

/** The ridge line in its own (untilted) frame: the profile laid across the
 *  full width, `base` at the lowest point, rising `amp` at the highest. */
const ridgeLine = (
  heights: number[],
  width: number,
  base: number,
  amp: number
): Coord[] =>
  heights.map((v, i) => [(i / (heights.length - 1)) * width, base - v * amp]);

/** The highest point within ±`radius` samples — the line text can run along
 *  without touching the ridge on short, sharp climbs. */
const upperEnvelope = (heights: number[], radius: number): number[] =>
  heights.map((_, i) => {
    let top = 0;
    for (let j = Math.max(0, i - radius); j <= i + radius; j += 1) {
      top = Math.max(top, heights[Math.min(j, heights.length - 1)]);
    }
    return top;
  });

export const ThemeRidge = ({
  colors,
  config = DEFAULT_RIDGE_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<RidgeCapability, RidgeConfig>) => {
  const format = useFormat();
  const { width: W, height: H } = format;
  const insets = useSafeInsets({ bottom: 70, left: 70, right: 70, top: 70 });
  const k = typeScale(W, H);
  const uid = useId();
  const level = metricsLevel(config.metrics, format.id);
  const tint = colors?.primary ?? RIDGE_TINT;
  const stats = wovenStats(data);

  const profile = wovenProfile(data);
  const base = (H * config.position) / 100;
  const amp = (H * config.height) / 100;
  const heights = profile
    ? smoothSeries(sampleProfile(profile.pts, SAMPLES), 2)
    : Array.from({ length: SAMPLES }, () => 0.4);
  const ridge = ridgeLine(heights, W, base, amp);

  // Tilt turns the whole ridge about the canvas centre. The sky region runs
  // the ridge out flat past both edges and closes far above, so no corner is
  // left untoned at any angle; it is turned numerically, because it is also
  // the photo copy's clip path.
  const angle = (config.tilt * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const turn = ([x, y]: Coord): Coord => [
    W / 2 + (x - W / 2) * cos - (y - H / 2) * sin,
    H / 2 + (x - W / 2) * sin + (y - H / 2) * cos,
  ];
  const far = Math.hypot(W, H);
  const [first] = ridge;
  const last = ridge.at(-1) ?? first;
  const skyPoly: Coord[] = [
    [-far, -far],
    [W + far, -far],
    [W + far, last[1]],
    ...ridge.toReversed(),
    [-far, first[1]],
  ];
  const sky = toPath(skyPoly.map(turn), true);
  const tiltTransform =
    config.tilt === 0 ? undefined : `rotate(${config.tilt} ${W / 2} ${H / 2})`;

  // The title follows the upper envelope of the ridge, lifted clear of it.
  const titleRail = ridgeLine(
    smoothSeries(upperEnvelope(heights, 6), 6),
    W,
    base,
    amp
  ).map(([x, y]): Coord => [x, y - 20 * k]);

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
  // Start the title away from the summit label.
  const titleStart = peak / SAMPLES < 0.4 ? "52%" : "4%";

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
      {/* Above the ridge: a toned copy of the photo… */}
      <PhotoCopy
        clip={sky}
        filter={SKY_FILTER[config.tone]}
        imageTransform={imageTransform}
        photoUrl={photoUrl}
      />
      {/* …tinted into the accent for the duotone. */}
      {config.tone === "duotone" ? (
        <Layer blend="multiply" label="Sky tint">
          <path d={sky} fill={mixHex(tint, "#ffffff", 0.18)} opacity={0.82} />
        </Layer>
      ) : null}
      <Layer label={data.title}>
        <defs>
          <linearGradient id={shadeId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
          <path d={toPath(titleRail)} id={railId} />
        </defs>
        <rect fill={`url(#${shadeId})`} height={H} width={W} />
        <g transform={tiltTransform}>
          <path
            d={toPath(ridge)}
            fill="none"
            stroke={WHITE}
            strokeLinejoin="round"
            strokeWidth={2.5 * k}
          />
          <text
            fill={WHITE}
            style={{ fontFamily: SERIF, fontSize: 44 * k, fontStyle: "italic" }}
          >
            <textPath href={`#${railId}`} startOffset={titleStart}>
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
        </g>

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
