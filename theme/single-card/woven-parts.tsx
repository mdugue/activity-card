// Shared building blocks of the "woven" themes (Ridge, Light Trail, Window,
// Contour, Word Path, Slices): the photo-led frame, extra clipped copies of the
// photo, full-canvas SVG layers, and the quiet caption / stat pieces.
//
// Treating the photo differently in different regions (toned above a ridge,
// colour only along the route) is done with STACKED PHOTO COPIES — each with
// its own CSS colour filter and clip path — never with a `color`/`saturation`
// blend layer: each copy publishes its own export descriptor, so the WebKit
// (iOS) compositor rebuilds the card exactly (see theme/export/photo-composite).
// Blend layers stay limited to `multiply` / `screen`, which composite linearly.

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
 *  theme's layers. `isolation` keeps the layers' blend modes inside the card.
 *  `photo: false` leaves the base photo out (for themes built only of copies). */
export const WovenFrame = ({
  children,
  fallback,
  imageTransform,
  photo = true,
  photoFilter = "",
  photoUrl,
}: {
  children: ReactNode;
  /** CSS background shown when there is no photo */
  fallback: string;
  imageTransform?: ImageTransform | null;
  photo?: boolean;
  /** CSS colour filter for the base photo (before the user's preset) */
  photoFilter?: string;
  photoUrl?: string | null;
}) => {
  const { width, height } = useFormat();
  return (
    <div style={{ ...FRAME_BASE, background: fallback, height, width }}>
      {photo && hasText(photoUrl) ? (
        <PhotoLayer
          filter={photoFilter}
          imageTransform={imageTransform}
          photoUrl={photoUrl}
        />
      ) : null}
      {children}
    </div>
  );
};

/** One more copy of the photo, clipped to `clip` (SVG path data in card px)
 *  with its own colour `filter` — e.g. the colour inside the route over a
 *  toned base. Renders nothing without a photo. */
export const PhotoCopy = ({
  clip,
  filter = "",
  imageTransform,
  photoUrl,
}: {
  clip: string;
  filter?: string;
  imageTransform?: ImageTransform | null;
  photoUrl?: string | null;
}) =>
  hasText(photoUrl) && clip !== "" ? (
    <PhotoLayer
      clip={clip}
      filter={filter}
      grain={false}
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    />
  ) : null;

const LAYER_BASE = {
  inset: 0,
  position: "absolute",
} satisfies CSSProperties;

/** One full-canvas SVG layer. `blend` composites the whole layer onto what is
 *  painted beneath it — `multiply` or `screen` only (they composite linearly,
 *  so the iOS export rebuilds them; see the header). */
export const Layer = ({
  blend,
  children,
  label,
}: {
  blend?: "multiply" | "screen";
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

/** Soft dark gradients at the top and bottom edge, behind the type — so the
 *  words stay readable when the user keeps the photo light. Draw it inside a
 *  `Layer`, before the text. */
export const TextScrim = ({
  bottom = true,
  id,
  strength,
  top = true,
}: {
  bottom?: boolean;
  /** unique gradient id */
  id: string;
  strength: number;
  top?: boolean;
}) => {
  const { width: W, height: H } = useFormat();
  if (strength <= 0) {
    return null;
  }
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={top ? 0.8 : 0} />
          <stop offset="0.2" stopColor="#000" stopOpacity="0" />
          <stop offset="0.72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={bottom ? 0.9 : 0} />
        </linearGradient>
      </defs>
      <rect fill={`url(#${id})`} height={H} opacity={strength} width={W} />
    </>
  );
};
