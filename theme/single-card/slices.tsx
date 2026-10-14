// SLICES — the photo cut into vertical strips, each one lifted as far as the
// elevation at its point of the activity: the strips' lower edges trace the
// profile, so the climb is built out of the picture instead of drawn on it.
// Every strip is its own clipped copy of the photo, shifted up, over a dark
// ground that carries the title. Type: Instrument Serif + IBM Plex Mono.

import type { Coord } from "@/lib/activity";
import { formatDateUpper, formatNumber } from "@/lib/format";
import { IDENTITY_TRANSFORM } from "@/lib/image-transform";
import { hasText } from "@/lib/text";
import {
  metricsLevel,
  sampleProfile,
  statLine,
  toPath,
  wovenProfile,
  wovenStats,
} from "@/lib/woven";
import { DEFAULT_SLICES_CONFIG } from "@/lib/woven-themes";
import type { SlicesConfig } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import type { SlicesCapability } from "./slices.theme";
import { Caption, Layer, PhotoCopy, Title, WovenFrame } from "./woven-parts";
import { typeScale } from "./woven-style";

const GROUND = "#0d0f12";
/** The share of the canvas the lowest strip still reaches down to. */
const LOWEST = 0.74;

const rect = (x: number, y: number, w: number, h: number): string =>
  `M${x.toFixed(1)} ${y.toFixed(1)}H${(x + w).toFixed(1)}V${(y + h).toFixed(1)}H${x.toFixed(1)}Z`;

export const ThemeSlices = ({
  config = DEFAULT_SLICES_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<SlicesCapability, SlicesConfig>) => {
  const format = useFormat();
  const { width: W, height: H } = format;
  const insets = useSafeInsets({ bottom: 70, left: 60, right: 60, top: 70 });
  const k = typeScale(W, H);
  const level = metricsLevel(config.metrics, format.id);
  const stats = wovenStats(data);
  const profile = wovenProfile(data);
  const t = imageTransform ?? IDENTITY_TRANSFORM;

  const n = config.strips;
  const stripW = W / n;
  const gap = Math.max(2, 3 * k);
  const reach = (H * config.relief) / 100;
  const heights = profile
    ? sampleProfile(profile.pts, n)
    : Array.from({ length: n }, () => 0.5);
  // Each strip's lower edge: the lowest point of the activity sits at LOWEST,
  // the highest `reach` above it. The photo in the strip moves up with it.
  const lifts = heights.map((v) => H * (1 - LOWEST) + v * reach);
  const edges = lifts.map((lift, i): Coord => [
    i * stripW + stripW / 2,
    H - lift,
  ]);

  let peak = 0;
  for (const [i, v] of heights.entries()) {
    if (v > heights[peak]) {
      peak = i;
    }
  }
  const peakLabel =
    profile?.useElevation === true ? `↑ ${formatNumber(profile.max)} m` : null;
  const kmPerStrip = data.distanceKm / n;
  const meta = [formatDateUpper(data.date), data.location]
    .filter(hasText)
    .join(" · ");
  const textTop = H - insets.bottom - (level === "off" ? 44 : 84) * k;

  return (
    <WovenFrame
      fallback={GROUND}
      imageTransform={imageTransform}
      photo={false}
      photoUrl={photoUrl}
    >
      {lifts.map((lift, i) => (
        <PhotoCopy
          clip={rect(i * stripW, 0, stripW - gap, H - lift)}
          imageTransform={{ ...t, y: t.y - lift }}
          key={`s${i * stripW}`}
          photoUrl={photoUrl}
        />
      ))}
      <Layer label={data.title}>
        {hasText(photoUrl)
          ? null
          : lifts.map((lift, i) => (
              <rect
                fill="#3a4250"
                height={H - lift}
                key={`f${i * stripW}`}
                width={stripW - gap}
                x={i * stripW}
                y={0}
              />
            ))}
        <path
          d={toPath(edges)}
          fill="none"
          opacity={0.9}
          stroke="#ffffff"
          strokeLinejoin="round"
          strokeWidth={1.5 * k}
          transform={`translate(${-gap / 2} ${4 * k})`}
        />

        {level === "full" && peakLabel !== null ? (
          <Caption
            anchor="middle"
            opacity={1}
            size={20 * k}
            x={Math.min(Math.max(edges[peak][0], 90 * k), W - 90 * k)}
            y={edges[peak][1] + 40 * k}
          >
            {peakLabel}
          </Caption>
        ) : null}

        <Title size={60 * k} x={insets.left} y={textTop}>
          {data.title}
        </Title>
        <Caption
          opacity={level === "off" ? 0.7 : 0.9}
          size={20 * k}
          x={insets.left + 2 * k}
          y={H - insets.bottom - (level === "off" ? 0 : 36) * k}
        >
          {level === "off" ? meta : statLine(stats)}
        </Caption>
        {level === "off" ? null : (
          <Caption
            opacity={0.55}
            size={16 * k}
            x={insets.left + 2 * k}
            y={H - insets.bottom}
          >
            {meta}
          </Caption>
        )}
        {level === "full" ? (
          <Caption
            anchor="end"
            opacity={0.55}
            size={16 * k}
            x={W - insets.right}
            y={H - insets.bottom}
          >
            {`1 STRIP = ${formatNumber(kmPerStrip, kmPerStrip < 10 ? 1 : 0)} KM`}
          </Caption>
        ) : null}
      </Layer>
    </WovenFrame>
  );
};
