// Shared building blocks of the "woven" themes (Ridge, Light Trail, Window,
// Contour, Word Path, Slices): the photo-led frame, full-canvas SVG layers that
// can blend into the photo beneath them, and the quiet caption / stat pieces.
// Everything rasterises as inline SVG + inline CSS (`mix-blend-mode` on a whole
// layer, never an SVG `<filter>` on the photo) so snapdom exports it intact.

import type { CSSProperties, ReactNode } from "react";

import type { ImageTransform } from "@/lib/image-transform";
import { hasText } from "@/lib/text";
import type { WovenStat } from "@/lib/woven";

import { useFormat } from "../shared/format-context";
import { PhotoLayer } from "../shared/photo-layer";
import { MONO, SERIF } from "./woven-style";

const FRAME_BASE = {
  isolation: "isolate",
  overflow: "hidden",
  position: "relative",
} satisfies CSSProperties;

/** The card root: the background photo (or a fallback wash) under the
 *  theme's layers. `isolation` keeps the layers' blend modes inside the card. */
export const WovenFrame = ({
  children,
  fallback,
  imageTransform,
  photoUrl,
}: {
  children: ReactNode;
  /** CSS background shown when there is no photo */
  fallback: string;
  imageTransform?: ImageTransform | null;
  photoUrl?: string | null;
}) => {
  const { width, height } = useFormat();
  return (
    <div style={{ ...FRAME_BASE, background: fallback, height, width }}>
      {hasText(photoUrl) ? (
        <PhotoLayer imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}
      {children}
    </div>
  );
};

const LAYER_BASE = {
  inset: 0,
  position: "absolute",
} satisfies CSSProperties;

/** One full-canvas SVG layer. `blend` composites the whole layer onto what is
 *  painted beneath it (the photo), e.g. `saturation` to drain colour. */
export const Layer = ({
  blend,
  children,
  label,
}: {
  blend?: CSSProperties["mixBlendMode"];
  children: ReactNode;
  label: string;
}) => {
  const { width, height } = useFormat();
  return (
    <svg
      height={height}
      aria-hidden="true"
      style={
        blend === undefined
          ? LAYER_BASE
          : { ...LAYER_BASE, mixBlendMode: blend }
      }
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <title>{label}</title>
      {children}
    </svg>
  );
};

interface TextProps {
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
  fill?: string;
  opacity?: number;
  x: number;
  y: number;
}

/** Small uppercase mono caption — dates, places, the one-line stats. */
export const Caption = ({
  anchor = "start",
  children,
  fill = "#ffffff",
  opacity = 0.8,
  size,
  x,
  y,
}: TextProps & { size: number }) => (
  <text
    fill={fill}
    opacity={opacity}
    style={{
      fontFamily: MONO,
      fontSize: size,
      letterSpacing: size * 0.22,
      textTransform: "uppercase",
    }}
    textAnchor={anchor}
    x={x}
    y={y}
  >
    {children}
  </text>
);

/** The serif title line. */
export const Title = ({
  anchor = "start",
  children,
  fill = "#ffffff",
  italic = false,
  opacity,
  size,
  x,
  y,
}: TextProps & { italic?: boolean; size: number }) => (
  <text
    fill={fill}
    opacity={opacity}
    style={{
      fontFamily: SERIF,
      fontSize: size,
      fontStyle: italic ? "italic" : "normal",
    }}
    textAnchor={anchor}
    x={x}
    y={y}
  >
    {children}
  </text>
);

/** The FULL metrics level: labelled values in columns, baseline at `y`. */
export const StatColumns = ({
  fill = "#ffffff",
  k,
  stats,
  x,
  y,
}: {
  fill?: string;
  k: number;
  stats: WovenStat[];
  x: number;
  y: number;
}) => (
  <g fill={fill}>
    {stats.map((s, i) => {
      const cx = x + i * 300 * k;
      return (
        <g key={s.label}>
          <text
            opacity={0.7}
            style={{
              fontFamily: MONO,
              fontSize: 18 * k,
              letterSpacing: 4 * k,
            }}
            x={cx}
            y={y - 84 * k}
          >
            {s.label}
          </text>
          <text style={{ fontFamily: SERIF, fontSize: 84 * k }} x={cx} y={y}>
            {s.value}
            {s.unit === "" ? null : (
              <tspan dx={8 * k} style={{ fontFamily: MONO, fontSize: 24 * k }}>
                {s.unit}
              </tspan>
            )}
          </text>
        </g>
      );
    })}
  </g>
);
