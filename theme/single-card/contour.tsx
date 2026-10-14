// CONTOUR — the route as the crest of a hill on a map: the route itself is
// the highest line, and ring after ring runs further out around it, spaced
// wider towards the foot like contour lines on a slope, warming from pale paper
// into the accent towards the crest. With FULL metrics they are labelled in
// metres. The rings are buffers of the route, so any shape reads — a loop, an
// out-and-back, a point-to-point climb. Placement presets fit the map to the
// route's shape: AUTO puts a wide route under the title and a tall one in a
// column beside it.
// Type: Instrument Serif (title) + IBM Plex Mono (labels, captions).

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { artPlacement, placePoints } from "@/lib/art-placement";
import { mixHex } from "@/lib/chart-helpers";
import { formatDateUpper, formatNumber } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  metricsLevel,
  resampleRoute,
  scrimStrength,
  splitTitle,
  statLine,
  toPath,
  wovenProfile,
  wovenRoute,
  wovenRoutePoints,
  wovenStats,
} from "@/lib/woven";
import type { WovenProfile } from "@/lib/woven";
import { DEFAULT_CONTOUR_CONFIG } from "@/lib/woven-themes";
import type { ContourConfig, ContourPlacement } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import type { ContourCapability } from "./contour.theme";
import { CONTOUR_ACCENT } from "./default-accents";
import { Caption, Layer, TextScrim, Title, WovenFrame } from "./woven-parts";
import { fallbackWash, typeScale } from "./woven-style";

const PAPER = "#ece6da";
const RING_POINTS = 420;

interface Box {
  h: number;
  w: number;
  x: number;
  y: number;
}

/** The share of the distance where the profile peaks (the middle when there
 *  is no profile). */
const summitShare = (profile: WovenProfile | null): number => {
  if (!profile) {
    return 0.5;
  }
  let [best] = profile.pts;
  for (const p of profile.pts) {
    if (p[1] > best[1]) {
      best = p;
    }
  }
  return best[0];
};

/** The unit normal of a polyline at point `i` (up when undefined). */
const normalAt = (pts: Coord[], i: number): Coord => {
  const a = pts.at(i);
  const b = pts.at(i + 1);
  if (!a || !b) {
    return [0, -1];
  }
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
};

/** The route's width/height ratio (1 when there is nothing to measure). */
const routeAspect = (route: Coord[] | null): number => {
  if (!route || route.length < 2) {
    return 1;
  }
  const xs = route.map((p) => p[0]);
  const ys = route.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return w > 0 && h > 0 ? w / h : 1;
};

/** AUTO: a tall route stands in a column beside the title; anything wider
 *  hangs under it. */
const resolvePlacement = (
  picked: ContourPlacement,
  data: Parameters<typeof wovenRoute>[0]
): Exclude<ContourPlacement, "auto"> => {
  if (picked !== "auto") {
    return picked;
  }
  return routeAspect(wovenRoute(data)) < 0.8 ? "side" : "hero";
};

/** Where the map hangs inside the safe box (`area`, above the stat line),
 *  given the title block's height. */
const mapBox = (
  placement: Exclude<ContourPlacement, "auto">,
  area: Box,
  titleH: number,
  k: number
): Box => {
  if (placement === "hero") {
    return {
      h: area.h - titleH - 50 * k,
      w: area.w,
      x: area.x,
      y: area.y + titleH + 40 * k,
    };
  }
  if (placement === "low") {
    const h = area.h * 0.46;
    return { h, w: area.w, x: area.x, y: area.y + area.h - h - 20 * k };
  }
  if (placement === "side") {
    return {
      h: area.h - titleH - 30 * k,
      w: area.w * 0.72,
      x: area.x + area.w * 0.28,
      y: area.y,
    };
  }
  // corner
  const side = Math.min(area.w, area.h) * 0.44;
  return { h: side, w: side, x: area.x + area.w - side, y: area.y };
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
  const uid = useId();
  const shadeId = `${uid}-shade`;
  const ringId = `${uid}-ring`;
  const level = metricsLevel(config.metrics, format.id);
  const accent = colors?.primary ?? CONTOUR_ACCENT;
  const stats = wovenStats(data);
  const profile = wovenProfile(data);

  const placement = resolvePlacement(config.placement, data);

  // The title block and the stat line, then the map in whatever is left.
  const lines = splitTitle(data.title, placement === "side" ? 12 : 18);
  const titleSize = (placement === "corner" ? 64 : 54) * k;
  const titleH = lines.length * titleSize + 40 * k;
  const statsH = level === "off" ? 0 : 60 * k;
  const bottom = H - insets.bottom - statsH;
  const titleAtTop = placement === "hero" || placement === "low";
  const box = mapBox(
    placement,
    {
      h: bottom - insets.top,
      w: W - insets.left - insets.right,
      x: insets.left,
      y: insets.top,
    },
    titleH,
    k
  );
  const { left } = insets;
  const { top } = insets;

  // The rings: the route is the summit line; each ring below it runs a
  // little further out (a buffer of the route, rounded at the ends), spaced
  // wider towards the foot like real contours on a slope. Any route shape
  // works — a loop, an out-and-back, a point-to-point climb.
  // The user's placement (drag / pinch on the card) moves and scales the
  // whole map about its box centre.
  const place = artPlacement(config, W, H);
  const designedReach = Math.min(box.w, box.h) * 0.2;
  const reach = designedReach * place.scale;
  const centre: Coord = [box.x + box.w / 2, box.y + box.h / 2];
  const outline = resampleRoute(
    placePoints(
      wovenRoutePoints(data, box.w, box.h, designedReach + 8 * k).map(
        ([x, y]): Coord => [x + box.x, y + box.y]
      ),
      place,
      centre
    ),
    RING_POINTS
  );
  const d = toPath(outline);
  const summitPt =
    outline.at(Math.round(summitShare(profile) * (outline.length - 1))) ??
    centre;
  const hair = 1.8 * k;
  const rings = Array.from({ length: config.rings }, (_, r) => {
    const share = config.rings > 1 ? r / (config.rings - 1) : 0;
    return { dist: reach * share ** 1.35, t: 1 - share };
  });
  // Where the ring labels sit: off the route at one point, along its normal.
  const labelAt = outline.at(Math.round(outline.length * 0.1));
  const normal = normalAt(outline, Math.round(outline.length * 0.1));
  const heightAt = (t: number): number | null =>
    profile?.useElevation === true
      ? profile.min + t * (profile.max - profile.min)
      : null;
  const summit = heightAt(1);
  const dim = config.dim / 100;

  const meta = [data.location, formatDateUpper(data.date)]
    .filter(hasText)
    .join(" · ");
  const titleY = titleAtTop
    ? top + titleSize * 0.82
    : bottom - titleH + titleSize * 0.82;

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    >
      <Layer label={data.title}>
        <defs>
          <linearGradient
            id={shadeId}
            x1="0"
            x2="0"
            y1={titleAtTop ? "1" : "0"}
            y2={titleAtTop ? "0" : "1"}
          >
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity={0.3 + 0.67 * dim} />
          </linearGradient>
        </defs>
        <rect fill="#000" height={H} opacity={0.6 * dim} width={W} />
        <rect fill={`url(#${shadeId})`} height={H} width={W} />
        <TextScrim
          id={`${uid}-scrim`}
          strength={scrimStrength(dim, 0.3, 0.5)}
          top={false}
        />
        <defs>
          {rings.slice(1).map(({ dist, t }) => (
            <g key={t}>
              <mask id={`${ringId}-${t}`} maskUnits="userSpaceOnUse">
                <path
                  d={d}
                  fill="none"
                  stroke="#fff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2 * dist + hair}
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={Math.max(0, 2 * dist - hair)}
                />
              </mask>
              <mask id={`${ringId}-s${t}`} maskUnits="userSpaceOnUse">
                <path
                  d={d}
                  fill="none"
                  stroke="#fff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2 * dist + hair * 3}
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={Math.max(0, 2 * dist - hair * 3)}
                />
              </mask>
            </g>
          ))}
        </defs>
        {/* A faint shadow under each ring keeps it readable on any photo. */}
        {rings.slice(1).map(({ t }) => (
          <rect
            fill="#000"
            height={H}
            key={`s${t}`}
            mask={`url(#${ringId}-s${t})`}
            opacity={0.3}
            width={W}
          />
        ))}
        {rings.slice(1).map(({ t }) => (
          <rect
            fill={mixHex(PAPER, accent, t)}
            height={H}
            key={t}
            mask={`url(#${ringId}-${t})`}
            opacity={0.7 + 0.3 * t}
            width={W}
          />
        ))}
        {/* The summit line: the route itself. */}
        <path
          d={d}
          fill="none"
          opacity={0.35}
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={hair * 4}
        />
        <path
          d={d}
          fill="none"
          stroke={accent}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={hair * 1.8}
        />

        {level === "full" && labelAt
          ? rings.map(({ dist, t }, r) => {
              const h = heightAt(t);
              const labelled = r % 2 === 0 && r > 0;
              return !labelled || h === null ? null : (
                <Caption
                  anchor="middle"
                  fill={mixHex(PAPER, accent, t)}
                  key={t}
                  opacity={1}
                  size={15 * k}
                  x={labelAt[0] + normal[0] * dist}
                  y={labelAt[1] + normal[1] * dist + 5 * k}
                >
                  {formatNumber(h)}
                </Caption>
              );
            })
          : null}
        {level !== "off" && summit !== null ? (
          <g>
            <circle
              cx={summitPt[0]}
              cy={summitPt[1]}
              fill={accent}
              r={7 * k}
              stroke={PAPER}
              strokeWidth={2 * k}
            />
            <Caption
              anchor={summitPt[0] > W * 0.7 ? "end" : "start"}
              fill={PAPER}
              opacity={1}
              size={22 * k}
              x={summitPt[0] + (summitPt[0] > W * 0.7 ? -20 : 20) * k}
              y={summitPt[1] + 7 * k}
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
            size={titleSize}
            x={left}
            y={titleY + i * titleSize}
          >
            {line}
          </Title>
        ))}
        <Caption
          fill={PAPER}
          opacity={0.7}
          size={18 * k}
          x={left + 2 * k}
          y={titleY + (lines.length - 1) * titleSize + 38 * k}
        >
          {meta}
        </Caption>
        {level === "off" ? null : (
          <Caption
            fill={PAPER}
            opacity={0.9}
            size={22 * k}
            x={left}
            y={H - insets.bottom}
          >
            {level === "full" ? statLine(stats) : statLine(stats.slice(0, 2))}
          </Caption>
        )}
      </Layer>
    </WovenFrame>
  );
};
