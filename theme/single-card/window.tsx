// WINDOW — the photo goes black-and-white everywhere except along the route,
// where its own colour comes back: the route is made of the landscape. A
// `saturation` layer drains the photo through a mask with the route cut out.
// Type: Instrument Serif (title, values) + IBM Plex Mono (captions).

import { useId } from "react";

import type { Coord } from "@/lib/activity";
import { formatDateUpper } from "@/lib/format";
import { hasText } from "@/lib/text";
import {
  metricsLevel,
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
import { Caption, Layer, StatColumns, Title, WovenFrame } from "./woven-parts";
import { fallbackWash, typeScale } from "./woven-style";

const WHITE = "#ffffff";

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
  const uid = useId();
  const level = metricsLevel(config.metrics, format.id);
  const stats = wovenStats(data);
  const band = config.band * k;

  // The route fills the space between the title and the caption.
  const top = insets.top + 160 * k;
  const bottom = H - insets.bottom - (level === "full" ? 200 : 110) * k;
  const local = wovenRoutePoints(data, W, bottom - top, band / 2 + 40 * k);
  const route = local.map(([x, y]): Coord => [x, y + top]);
  const d = toPath(route);
  const start = route.at(0);
  const maskId = `${uid}-route`;
  const veilId = `${uid}-veil`;
  const meta = [data.location, formatDateUpper(data.date)]
    .filter(hasText)
    .join(" · ");

  // Each layer carries its own copy: a mask is never referenced across <svg>s.
  const cutout = (id: string) => (
    <mask height={H} id={id} maskUnits="userSpaceOnUse" width={W} x={0} y={0}>
      <rect fill={WHITE} height={H} width={W} />
      <path
        d={d}
        fill="none"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={band}
      />
    </mask>
  );

  return (
    <WovenFrame
      fallback={fallbackWash(data.sport)}
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    >
      <Layer blend="saturation" label="Black and white">
        <defs>{cutout(maskId)}</defs>
        <rect fill="#808080" height={H} mask={`url(#${maskId})`} width={W} />
      </Layer>
      <Layer label={data.title}>
        <defs>{cutout(veilId)}</defs>
        <rect
          fill="#000"
          height={H}
          mask={`url(#${veilId})`}
          opacity={0.35}
          width={W}
        />
        <path
          d={d}
          fill="none"
          opacity={0.9}
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
