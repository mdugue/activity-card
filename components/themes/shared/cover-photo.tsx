// Natural-size-aware cover photo, shared by the single-card photo layers and
// the carousel panorama. Draws the image at its true cover size for the given
// box and applies pan/zoom + rotate/mirror + filter as transforms. A quarter
// turn swaps the element's width/height (so the rotated footprint still covers
// the box) — a plain CSS rotate on a box-sized div would expose the corners.
// Pure inline CSS (no backdrop-filter) so html-to-image captures it.

import type { ImageSize } from "@/hooks/use-image-natural-size";
import {
  coverSize,
  IDENTITY_TRANSFORM,
  type ImageTransform,
} from "@/lib/image-transform";
import {
  filterCss,
  GRAIN_BG,
  isQuarterTurn,
  NO_EFFECTS,
  type PhotoEffects,
} from "@/lib/photo-effects";

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

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: elW,
          height: elH,
          left: (boxW - elW) / 2,
          top: (boxH - elH) / 2,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: filterParts || undefined,
          transform: `translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) scale(${t.scale.toFixed(4)}) rotate(${fx.rotate}deg) scaleX(${fxScaleX}) scaleY(${fxScaleY})`,
          transformOrigin: "center center",
        }}
      />
      {fx.grain ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: GRAIN_BG,
            backgroundRepeat: "repeat",
            backgroundSize: "180px 180px",
            mixBlendMode: "overlay",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}
