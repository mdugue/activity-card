// SLICES — the photo cut into vertical strips, each one reaching as high as
// the elevation at its point of the activity: the profile is built out of the
// picture instead of drawn on it. Dark ground and the gaps between strips are
// painted over the photo, so the photo itself stays one plain layer.
// Type: Instrument Serif (title) + IBM Plex Mono (captions).

import type { Coord } from "@/lib/activity";
import { formatDateUpper, formatNumber } from "@/lib/format";
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
import { Caption, Layer, Title, WovenFrame } from "./woven-parts";
import { fallbackWash, typeScale } from "./woven-style";

const GROUND = "#0d0f12";

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

  const n = config.strips;
  const stripW = W / n;
  const gap = Math.max(2, 3 * k);
  // The text zone under the lowest strip, then the profile's reach above it.
  const floor = H - insets.bottom - 150 * k;
  const reach = H * 0.36;
  const heights = profile
    ? sampleProfile(profile.pts, n)
    : Array.from({ length: n }, () => 0.5);
  const tops = heights.map((v) => floor - v * reach);
  const edge = tops.map((y, i): Coord => [i * stripW + stripW / 2, y]);

  let peak = 0;
  for (const [i, v] of heights.entries()) {
    if (v > heights[peak]) {
      peak = i;
    }
  }
  const peakLabel =
    profile?.useElevation === true ? `↑ ${formatNumber(profile.max)} m` : null;
  const meta = [formatDateUpper(data.date), data.location]
    .filter(hasText)
    .join(" · ");

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    >
      <Layer label={data.title}>
        {tops.map((y, i) => (
          <rect
            fill={GROUND}
            height={H - y}
            key={`g${i * stripW}`}
            width={stripW + 0.5}
            x={i * stripW}
            y={y}
          />
        ))}
        {tops.slice(1).map((_, i) => (
          <rect
            fill={GROUND}
            height={H}
            key={`s${(i + 1) * stripW}`}
            width={gap}
            x={(i + 1) * stripW - gap / 2}
            y={0}
          />
        ))}
        <path
          d={toPath(edge)}
          fill="none"
          stroke="#ffffff"
          strokeLinejoin="round"
          strokeWidth={2 * k}
        />

        {level === "full" && peakLabel !== null ? (
          <Caption
            anchor="middle"
            opacity={1}
            size={20 * k}
            x={Math.min(Math.max(edge[peak][0], 90 * k), W - 90 * k)}
            y={edge[peak][1] - 18 * k}
          >
            {peakLabel}
          </Caption>
        ) : null}

        <Title
          size={60 * k}
          x={insets.left}
          y={H - insets.bottom - (level === "off" ? 44 : 84) * k}
        >
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
      </Layer>
    </WovenFrame>
  );
};
