"use client";

// Shared photo plumbing for single-card themes. The active filter / grain /
// mirror / rotate AND the photo's natural size are provided once by
// `RenderTheme` and read by each photo layer via context — so every theme's
// background photo is adjustable without threading props through all eight
// theme components. Rendered directly (in stories) without a provider, the
// layers see `null` and render unfiltered, exactly as before.

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { ImageSize } from "@/hooks/use-image-natural-size";
import { IDENTITY_TRANSFORM, transformToCss } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";
import {
  encodePhotoDraw,
  PHOTO_LAYER_ATTR,
  PHOTO_PAINT_ATTR,
} from "@/lib/photo-draw";
import {
  effectsTransformSuffix,
  filterCss,
  GRAIN_BG,
  isQuarterTurn,
} from "@/lib/photo-effects";
import type { PhotoEffects } from "@/lib/photo-effects";

export interface PhotoFx {
  effects: PhotoEffects | null;
  /** natural size of the photo — enables the rotation-correct cover layer */
  imageSize: ImageSize | null;
}

const PhotoFxContext = createContext<PhotoFx>({
  effects: null,
  imageSize: null,
});

/** Provided by `RenderTheme` (single card) and the carousel deck. The photo
 *  source and pan/zoom are NOT in context: single-card themes take them as
 *  props, and the deck draws the strip photo itself with `CoverPhoto`. */
export const PhotoFxProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value: PhotoFx;
}) => <PhotoFxContext value={value}>{children}</PhotoFxContext>;

export const usePhotoEffects = (): PhotoEffects | null =>
  useContext(PhotoFxContext).effects;

export const usePhotoImageSize = (): ImageSize | null =>
  useContext(PhotoFxContext).imageSize;

/** Shared CSS background-image cover layer behind the single-card photo
 *  treatments. Each treatment passes its own hand-tuned `restInset` (the
 *  non-quarter-turn bleed), `filterPrefix` and `opacity`; a quarter-turn
 *  over-bleeds to -160 so the rotated footprint still covers the box. Reads
 *  effects from context; inline CSS only (snapdom-safe). */
export const CssCoverImage = ({
  photoUrl,
  imageTransform,
  restInset = 0,
  filterPrefix = "",
  opacity,
}: {
  filterPrefix?: string;
  imageTransform?: ImageTransform | null;
  opacity?: number;
  photoUrl: string;
  restInset?: number;
}) => {
  const fx = usePhotoEffects();
  const userFilter = fx ? filterCss(fx.filter) : "";
  const filter = [filterPrefix, userFilter].filter(Boolean).join(" ").trim();
  const inset = fx && isQuarterTurn(fx.rotate) ? -160 : restInset;
  const t = imageTransform ?? IDENTITY_TRANSFORM;
  // The transformed div can't describe its own untransformed box, so it sits in
  // a plain full-bleed wrapper that carries the export descriptor (the exporter
  // measures the wrapper and applies the inset) — see lib/photo-draw.
  return (
    <div
      {...{
        [PHOTO_LAYER_ATTR]: encodePhotoDraw({
          box: { inset, kind: "inset" },
          filter,
          flipH: fx?.flipH ?? false,
          flipV: fx?.flipV ?? false,
          opacity: opacity ?? 1,
          rotate: fx?.rotate ?? 0,
          scale: t.scale,
          src: photoUrl,
          x: t.x,
          y: t.y,
        }),
      }}
      style={{ inset: 0, position: "absolute" }}
    >
      <div
        {...{ [PHOTO_PAINT_ATTR]: "" }}
        style={{
          backgroundImage: `url(${photoUrl})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          filter: filter || undefined,
          inset,
          opacity,
          position: "absolute",
          transform: `${transformToCss(t)}${effectsTransformSuffix(fx)}`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
};

/** Analogue film grain overlaid on a photo (survives snapdom as an image).
 *  Lay it over the photo div inside the same clipped container. */
export const GrainOverlay = () => (
  <div
    aria-hidden
    style={{
      backgroundImage: GRAIN_BG,
      backgroundRepeat: "repeat",
      backgroundSize: "180px 180px",
      inset: 0,
      mixBlendMode: "overlay",
      opacity: 0.5,
      pointerEvents: "none",
      position: "absolute",
    }}
  />
);
