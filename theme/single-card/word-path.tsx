// WORD PATH — the route is written, not drawn: the title (and, with metrics
// on, the numbers) run along it as one endless band of text over a drained,
// darkened photo. Whole repeats are stretched (`textLength`) to close the
// route exactly. Type: Bricolage Grotesque (the band) + IBM Plex Mono.

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { formatDateUpper } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  DEFAULT_WOVEN_CONFIG,
  metricsLevel,
  polylineLength,
  statLine,
  toPath,
  wovenRoutePoints,
  wovenStats,
} from "@/lib/woven";
import type { MetricsLevel, WovenConfig } from "@/lib/woven";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { WORD_PATH_ACCENT } from "./default-accents";
import type { WordPathCapability } from "./word-path.theme";
import { Caption, Layer, WovenFrame } from "./woven-parts";
import { fallbackWash, SANS, typeScale } from "./woven-style";

const FONT_SIZE = 34;
const TRACKING = 3;
/** Average advance of an upper-case Bricolage glyph, in ems (tuned on renders).
 *  Only decides how many repeats fit; `textLength` makes the fit exact. */
const ADVANCE = 0.66;
const SEP = "  ·  ";

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
  config = DEFAULT_WOVEN_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<WordPathCapability, WovenConfig>) => {
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
  const length = polylineLength(route);
  const unit = bandUnit(data.title, statLine(wovenStats(data)), meta, level);
  const glyph = (ADVANCE * FONT_SIZE + TRACKING) * k;
  const repeats = Math.max(1, Math.round(length / (unit.length * glyph)));
  const band = unit.repeat(repeats);
  const railId = `${uid}-rail`;
  const start = route.at(0);

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    >
      <Layer blend="saturation" label="Black and white">
        <rect fill="#808080" height={H} opacity={0.9} width={W} />
      </Layer>
      <Layer label={data.title}>
        <defs>
          <path d={toPath(route)} id={railId} />
        </defs>
        <rect fill="#000" height={H} opacity={0.38} width={W} />
        <path
          d={toPath(route)}
          fill="none"
          opacity={0.06}
          stroke="#ffffff"
          strokeLinejoin="round"
          strokeWidth={64 * k}
        />
        {length > 0 ? (
          <text
            fill="#ffffff"
            style={{
              fontFamily: SANS,
              fontSize: FONT_SIZE * k,
              fontWeight: 700,
              letterSpacing: TRACKING * k,
            }}
          >
            <textPath
              href={`#${railId}`}
              lengthAdjust="spacing"
              textLength={Math.max(1, length - 12 * k)}
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
