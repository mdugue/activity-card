// WINDOW — the photo goes black-and-white everywhere except along the route,
// where its own colour comes back: the route is made of the landscape. The
// base photo is toned grey; a second copy in full colour is clipped to a band
// around the route. A soft shadow and a hairline edge (each optional) lift the
// band off the grey so it reads on busy photos too.
// Type: Instrument Serif (title, values) + IBM Plex Mono (captions).

import type { Coord } from "@/lib/activity";
import { formatDateUpper } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  bandPath,
  metricsLevel,
  resampleRoute,
  statLine,
  toPath,
  wovenRoutePoints,
  wovenStats,
} from "@/lib/woven";
import { DEFAULT_WINDOW_CONFIG } from "@/lib/woven-themes";
import type { WindowConfig } from "@/lib/woven-themes";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import type { WindowCapability } from "./window.theme";
import {
  Caption,
  Layer,
  PhotoCopy,
  StatColumns,
  Title,
  WovenFrame,
} from "./woven-parts";
import { fallbackWash, typeScale } from "./woven-style";

const WHITE = "#ffffff";
/** Points the band outline is built from — plenty for a smooth band at any
 *  width, few enough to keep the clip path light. */
const BAND_POINTS = 360;
/** The grey the rest of the photo is pressed into. */
const TONED = "grayscale(1) brightness(0.68) contrast(1.12)";
const COLOUR = "saturate(1.18) contrast(1.04)";
/** Shadow passes under the band, widest first: extra width and opacity. */
const SHADOW = [
  { extra: 64, opacity: 0.1 },
  { extra: 40, opacity: 0.12 },
  { extra: 22, opacity: 0.16 },
  { extra: 10, opacity: 0.22 },
] as const;

export const ThemeWindow = ({
  config = DEFAULT_WINDOW_CONFIG,
  data,
  imageTransform,
  photoUrl,
}: ThemeProps<WindowCapability, WindowConfig>) => {
  const format = useFormat();
  const { width: W, height: H } = format;
  const insets = useSafeInsets({ bottom: 70, left: 70, right: 70, top: 70 });
  const k = typeScale(W, H);
  const level = metricsLevel(config.metrics, format.id);
  const stats = wovenStats(data);
  const band = config.band * k;
  const shadow = config.edge === "shadow" || config.edge === "both";
  const line = config.edge === "line" || config.edge === "both";

  // The route fills the space between the title and the caption.
  const top = insets.top + 160 * k;
  const bottom = H - insets.bottom - (level === "full" ? 200 : 110) * k;
  const local = wovenRoutePoints(data, W, bottom - top, band / 2 + 40 * k);
  const route = resampleRoute(
    local.map(([x, y]): Coord => [x, y + top]),
    BAND_POINTS
  );
  const d = toPath(route);
  const clip = bandPath(route, band);
  const start = route.at(0);
  const meta = [data.location, formatDateUpper(data.date)]
    .filter(hasText)
    .join(" · ");

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoFilter={TONED}
      photoUrl={photoUrl}
    >
      {/* Under the colour band: its shadow and its hairline edge. */}
      <Layer label="Band edge">
        {shadow
          ? SHADOW.map((pass) => (
              <path
                d={d}
                fill="none"
                key={pass.extra}
                opacity={pass.opacity}
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={band + pass.extra * k}
                transform={`translate(0 ${6 * k})`}
              />
            ))
          : null}
        {line ? (
          <path
            d={d}
            fill="none"
            opacity={0.9}
            stroke={WHITE}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={band + 4 * k}
          />
        ) : null}
      </Layer>
      <PhotoCopy
        clip={clip}
        filter={COLOUR}
        imageTransform={imageTransform}
        photoUrl={photoUrl}
      />
      <Layer label={data.title}>
        <path
          d={d}
          fill="none"
          opacity={0.85}
          stroke={WHITE}
          strokeDasharray={`${2 * k} ${10 * k}`}
          strokeLinecap="round"
          strokeWidth={1.5 * k}
        />
        {start ? (
          <circle cx={start[0]} cy={start[1]} fill={WHITE} r={9 * k} />
        ) : null}

        <Title size={64 * k} x={insets.left} y={insets.top + 54 * k}>
          {data.title}
        </Title>
        <Caption
          opacity={0.75}
          size={20 * k}
          x={insets.left + 2 * k}
          y={insets.top + 96 * k}
        >
          {meta}
        </Caption>

        {level === "subtle" ? (
          <Caption
            opacity={0.95}
            size={24 * k}
            x={insets.left}
            y={H - insets.bottom}
          >
            {statLine(stats)}
          </Caption>
        ) : null}
        {level === "full" ? (
          <StatColumns
            k={k}
            stats={stats}
            x={insets.left}
            y={H - insets.bottom}
          />
        ) : null}
      </Layer>
    </WovenFrame>
  );
};
