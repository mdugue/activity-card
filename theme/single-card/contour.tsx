// CONTOUR — the route, drawn again and again at shrinking scale around its own
// centre, becomes a height map hung in the photo's open space. The rings warm
// from pale paper into the accent towards the summit; with FULL metrics they
// are labelled in metres like the contour lines of a map.
// Type: Instrument Serif (title) + IBM Plex Mono (labels, captions).

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { mixHex } from "@/lib/chart-helpers";
import { formatDateUpper, formatNumber } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  metricsLevel,
  splitTitle,
  statLine,
  toPath,
  wovenProfile,
  wovenRoutePoints,
  wovenStats,
} from "@/lib/woven";
import { DEFAULT_CONTOUR_CONFIG } from "@/lib/woven-themes";
import type { ContourConfig } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import type { ContourCapability } from "./contour.theme";
import { CONTOUR_ACCENT } from "./default-accents";
import { Caption, Layer, Title, WovenFrame } from "./woven-parts";
import { fallbackWash, typeScale } from "./woven-style";

const PAPER = "#ece6da";
/** The innermost ring's scale relative to the outermost. */
const INNERMOST = 0.1;

const centroid = (pts: Coord[]): Coord => {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
};

export const ThemeContour = ({
  colors,
  config = DEFAULT_CONTOUR_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<ContourCapability, ContourConfig>) => {
  const format = useFormat();
  const { width: W, height: H } = format;
  const insets = useSafeInsets({ bottom: 70, left: 70, right: 70, top: 70 });
  const k = typeScale(W, H);
  const shadeId = `${useId()}-shade`;
  const level = metricsLevel(config.metrics, format.id);
  const accent = colors?.primary ?? CONTOUR_ACCENT;
  const stats = wovenStats(data);
  const profile = wovenProfile(data);

  // The map hangs in the upper part of the canvas, right of the title column.
  const size = Math.min(W * 0.95, H * 0.5);
  const box = wovenRoutePoints(data, size, size);
  const [mx, my] = box.length > 0 ? centroid(box) : [size / 2, size / 2];
  const cx = W * 0.56;
  const cy = Math.max(insets.top + size * 0.45, H * 0.3);
  const rings = Array.from({ length: config.rings }, (_, r) => {
    const t = config.rings > 1 ? r / (config.rings - 1) : 1;
    const scale = 1 - t * (1 - INNERMOST);
    const pts = box.map(([x, y]): Coord => [
      cx + (x - mx) * scale,
      cy + (y - my) * scale,
    ]);
    return { pts, t };
  });
  const heightAt = (t: number): number | null =>
    profile?.useElevation === true
      ? profile.min + t * (profile.max - profile.min)
      : null;
  const summit = heightAt(1);

  const lines = splitTitle(data.title, 18);
  const meta = [data.location, formatDateUpper(data.date)]
    .filter(hasText)
    .join(" · ");

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    >
      <Layer label={data.title}>
        <defs>
          <linearGradient id={shadeId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0.7" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <rect fill="#000" height={H} opacity={0.15} width={W} />
        <rect fill={`url(#${shadeId})`} height={H} width={W} />
        {rings.map(({ pts, t }) => (
          <path
            d={toPath(pts, true)}
            fill="none"
            key={t}
            opacity={0.55 + 0.45 * t}
            stroke={mixHex(PAPER, accent, t)}
            strokeLinejoin="round"
            strokeWidth={(t === 1 ? 3 : 1.6) * k}
          />
        ))}

        {level === "full"
          ? rings.map(({ pts, t }, r) => {
              const h = heightAt(t);
              const p = pts.at(Math.round(pts.length * 0.08));
              const labelled = r % 2 === 0 && r < rings.length - 1;
              return !labelled || h === null || p === undefined ? null : (
                <Caption
                  fill={mixHex(PAPER, accent, t)}
                  key={t}
                  opacity={1}
                  size={17 * k}
                  x={p[0] + 10 * k}
                  y={p[1]}
                >
                  {formatNumber(h)}
                </Caption>
              );
            })
          : null}
        {level !== "off" && summit !== null ? (
          <g>
            <circle cx={cx} cy={cy - 6 * k} fill={accent} r={6 * k} />
            <Caption
              fill={accent}
              opacity={1}
              size={22 * k}
              x={cx + 22 * k}
              y={cy}
            >
              {`${formatNumber(summit)} m`}
            </Caption>
          </g>
        ) : null}

        {lines.map((line, i) => (
          <Title
            fill={PAPER}
            italic={i === lines.length - 1 && lines.length > 1}
            key={line}
            size={54 * k}
            x={insets.left}
            y={insets.top + 44 * k + i * 54 * k}
          >
            {line}
          </Title>
        ))}
        <Caption
          fill={PAPER}
          opacity={0.7}
          size={18 * k}
          x={insets.left + 2 * k}
          y={insets.top + 44 * k + lines.length * 54 * k + 8 * k}
        >
          {meta}
        </Caption>
        {level === "off" ? null : (
          <Caption
            fill={PAPER}
            opacity={0.9}
            size={22 * k}
            x={insets.left}
            y={H - insets.bottom}
          >
            {level === "full" ? statLine(stats) : statLine(stats.slice(0, 2))}
          </Caption>
        )}
      </Layer>
    </WovenFrame>
  );
};
