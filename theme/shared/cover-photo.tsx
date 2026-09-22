// Natural-size-aware cover photo, shared by the single-card photo layers and
// the carousel panorama. Draws the image at its true cover size for the given
// box and applies pan/zoom + rotate/mirror + filter as transforms. A quarter
// turn swaps the element's width/height (so the rotated footprint still covers
// the box) — a plain CSS rotate on a box-sized div would expose the corners.
// Pure inline CSS (no backdrop-filter) so snapdom captures it.

import type { ImageSize } from "@/hooks/use-image-natural-size";
import { coverSize, IDENTITY_TRANSFORM } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";
import {
  encodePhotoDraw,
  PHOTO_LAYER_ATTR,
  PHOTO_PAINT_ATTR,
} from "@/lib/photo-draw";
import { filterCss, isQuarterTurn, NO_EFFECTS } from "@/lib/photo-effects";
import type { PhotoEffects } from "@/lib/photo-effects";

import { GrainOverlay } from "./photo-fx";

interface CoverPhotoProps {
  boxH: number;
  boxW: number;
  effects?: PhotoEffects | null;
  /** extra CSS filter prepended before the user preset (e.g. desaturate) */
  extraFilter?: string;
  imageSize: ImageSize;
  opacity?: number;
  photoUrl: string;
  transform?: ImageTransform | null;
}

export function CoverPhoto({
  photoUrl,
  imageSize,
  boxW,
  boxH,
  transform,
  effects,
  extraFilter,
  opacity = 1,
}: CoverPhotoProps) {
  const t = transform ?? IDENTITY_TRANSFORM;
  const fx = effects ?? NO_EFFECTS;
  const quarter = isQuarterTurn(fx.rotate);
  // Displayed aspect after rotation → its cover footprint on the box.
  const dispW = quarter ? imageSize.h : imageSize.w;
  const dispH = quarter ? imageSize.w : imageSize.h;
  const base = coverSize(boxW, boxH, dispW, dispH);
  // Pre-rotation element size (swapped for quarter turns so the post-rotation
  // footprint equals `base`); the element's aspect equals the image's, so
  // `background-size: cover` fills it without cropping.
  const elW = quarter ? base.h : base.w;
  const elH = quarter ? base.w : base.h;

  const fxScaleX = fx.flipH ? -1 : 1;
  const fxScaleY = fx.flipV ? -1 : 1;
  const filterParts = [extraFilter ?? "", filterCss(fx.filter)]
    .filter(Boolean)
    .join(" ");

  const left = (boxW - elW) / 2;
  const top = (boxH - elH) / 2;

  return (
    <div
      aria-hidden
      // Published so the export pipeline can repaint this layer itself on
      // engines that drop bitmaps from the rasterised SVG — see lib/photo-draw.
      {...{
        [PHOTO_LAYER_ATTR]: encodePhotoDraw({
          box: { kind: "box", x: left, y: top, w: elW, h: elH },
          filter: filterParts,
          flipH: fx.flipH,
          flipV: fx.flipV,
          opacity: 1,
          rotate: fx.rotate,
          scale: t.scale,
          src: photoUrl,
          x: t.x,
          y: t.y,
        }),
      }}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        {...{ [PHOTO_PAINT_ATTR]: "" }}
        style={{
          position: "absolute",
          width: elW,
          height: elH,
          left,
          top,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: filterParts || undefined,
          transform: `translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) scale(${t.scale.toFixed(4)}) rotate(${fx.rotate}deg) scaleX(${fxScaleX}) scaleY(${fxScaleY})`,
          transformOrigin: "center center",
        }}
      />
      {fx.grain ? <GrainOverlay /> : null}
    </div>
  );
}
