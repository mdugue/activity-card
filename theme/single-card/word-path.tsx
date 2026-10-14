// WORD PATH — the route is written, not drawn: the title (and, with metrics
// on, the numbers) run along it as one endless band of text over a drained,
// darkened photo. The text rides a smoothed copy of the route (hairpins open
// into curves letters can follow), sized by the user; the true route stays
// underneath as a faint hairline. Whole repeats are stretched (`textLength`)
// to close the route exactly. Type: Bricolage Grotesque + IBM Plex Mono.

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { formatDateUpper } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  metricsLevel,
  polylineLength,
  smoothRoute,
  statLine,
  toPath,
  wovenRoutePoints,
  wovenStats,
} from "@/lib/woven";
import type { MetricsLevel } from "@/lib/woven";
import { DEFAULT_WORD_PATH_CONFIG } from "@/lib/woven-themes";
import type { WordPathConfig } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { WORD_PATH_ACCENT } from "./default-accents";
import type { WordPathCapability } from "./word-path.theme";
import { Caption, Layer, WovenFrame } from "./woven-parts";
import { fallbackWash, SANS, typeScale } from "./woven-style";

/** Letter spacing, in ems. */
const TRACKING = 0.12;
/** Average advance of an upper-case Bricolage glyph, in ems (tuned on renders).
 *  Only decides how many repeats fit; `textLength` makes the fit exact. */
const ADVANCE = 0.62;
const SEP = "  ·  ";
/** Samples of the smoothed rail. */
const RAIL_POINTS = 480;
/** How far (in letter heights) the rail is smoothed: enough that a word never
 *  folds round a hairpin. */
const SMOOTHING = 2.2;
/** The grey the photo is pressed into. */
const TONED = "grayscale(1) brightness(0.52) contrast(1.15)";

const bandUnit = (
  title: string,
  stats: string,
  meta: string,
  level: MetricsLevel
): string => {
  const parts = [title.toUpperCase()];
  if (level !== "off") {
    parts.push(stats);
  }
  if (level === "full" && meta !== "") {
    parts.push(meta);
  }
  return `${parts.join(SEP)}${SEP}`;
};

export const ThemeWordPath = ({
  colors,
  config = DEFAULT_WORD_PATH_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<WordPathCapability, WordPathConfig>) => {
  const format = useFormat();
  const { width: W, height: H } = format;
  const insets = useSafeInsets({ bottom: 70, left: 70, right: 70, top: 70 });
  const k = typeScale(W, H);
  const uid = useId();
  const level = metricsLevel(config.metrics, format.id);
  const accent = colors?.primary ?? WORD_PATH_ACCENT;
  const meta = [formatDateUpper(data.date), data.location.toUpperCase()]
    .filter(hasText)
    .join(" · ");

  // The route fills the safe box, a little above centre to leave room for the
  // caption.
  const boxW = W - insets.left - insets.right;
  const boxH = H - insets.top - insets.bottom - 90 * k;
  const route = wovenRoutePoints(data, boxW, boxH, 40 * k).map(
    ([x, y]): Coord => [x + insets.left, y + insets.top]
  );
  const size = config.size * k;
  // Smooth over a few letter heights, measured in rail samples.
  const step = polylineLength(route) / RAIL_POINTS;
  const radius =
    step > 0
      ? Math.min(60, Math.max(1, Math.round((SMOOTHING * size) / step)))
      : 1;
  const rail = smoothRoute(route, RAIL_POINTS, radius);
  const length = polylineLength(rail);
  const unit = bandUnit(data.title, statLine(wovenStats(data)), meta, level);
  const glyph = (ADVANCE + TRACKING) * size;
  const repeats = Math.max(1, Math.round(length / (unit.length * glyph)));
  const band = unit.repeat(repeats);
  const railId = `${uid}-rail`;
  const start = route.at(0);

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoFilter={TONED}
      photoUrl={photoUrl}
    >
      <Layer label={data.title}>
        <defs>
          <path d={toPath(rail)} id={railId} />
        </defs>
        <path
          d={toPath(rail)}
          fill="none"
          opacity={0.07}
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={size * 2.2}
        />
        <path
          d={toPath(route)}
          fill="none"
          opacity={0.35}
          stroke={accent}
          strokeLinejoin="round"
          strokeWidth={1.2 * k}
        />
        {length > 0 ? (
          <text
            fill="#ffffff"
            dominantBaseline="central"
            style={{
              fontFamily: SANS,
              fontSize: size,
              fontWeight: 600,
              letterSpacing: TRACKING * size,
            }}
          >
            <textPath
              href={`#${railId}`}
              lengthAdjust="spacing"
              textLength={Math.max(1, length - size)}
            >
              {band}
            </textPath>
          </text>
        ) : null}
        {start ? (
          <circle cx={start[0]} cy={start[1]} fill={accent} r={10 * k} />
        ) : null}
        <Caption
          anchor="middle"
          opacity={0.75}
          size={20 * k}
          x={W / 2}
          y={H - insets.bottom}
        >
          {length > 0 ? meta : `${data.title} · ${meta}`}
        </Caption>
      </Layer>
    </WovenFrame>
  );
};
