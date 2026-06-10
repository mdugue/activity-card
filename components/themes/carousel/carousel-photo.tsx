// Carousel panorama photo. Draws the image at its true cover size for the wide
// strip and applies the user's pan/zoom (+ rotate, mirror, filter) as a
// transform — so the vertical overflow a wide strip leaves is actually
// pannable, and dragging never reveals the background. Clamp lives in
// `clampCoverTransform` (which must be fed the rotation-swapped dimensions).

import type { ImageSize } from "@/hooks/use-image-natural-size";
import {
  coverSize,
  IDENTITY_TRANSFORM,
  type ImageTransform,
} from "@/lib/image-transform";
import { GRAIN_BG, isQuarterTurn, type RotateDeg } from "@/lib/photo-effects";

interface CarouselPhotoProps {
  desaturate?: boolean;
  /** extra CSS filter preset, appended after the desaturate filter */
  filter?: string;
  flipH?: boolean;
  flipV?: boolean;
  /** overlay analogue film grain on the photo */
  grain?: boolean;
  imageSize: ImageSize;
  /** light themes render the panorama as a faint texture */
  opacity?: number;
  photoUrl: string;
  rotate?: RotateDeg;
  stripH: number;
  /** strip width (n × 1080); height is the slide height */
  stripW: number;
  transform?: ImageTransform | null;
}

export function CarouselPhoto({
  photoUrl,
  imageSize,
  stripW,
  stripH,
  transform,
  desaturate = false,
  opacity = 1,
  filter,
  grain = false,
  rotate = 0,
  flipH = false,
  flipV = false,
}: CarouselPhotoProps) {
  const t = transform ?? IDENTITY_TRANSFORM;
  const quarter = isQuarterTurn(rotate);
  // Displayed aspect after rotation → its cover footprint on the strip.
  const dispW = quarter ? imageSize.h : imageSize.w;
  const dispH = quarter ? imageSize.w : imageSize.h;
  const base = coverSize(stripW, stripH, dispW, dispH);
  // Pre-rotation element size (swapped for quarter turns so the post-rotation
  // footprint equals `base`); the element's aspect equals the image's, so
  // `background-size: cover` fills it without cropping.
  const elW = quarter ? base.h : base.w;
  const elH = quarter ? base.w : base.h;

  const fx = flipH ? -1 : 1;
  const fy = flipV ? -1 : 1;
  const filterParts = [
    desaturate ? "saturate(0.6) brightness(1.05)" : "",
    filter ?? "",
  ]
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
      }}
    >
      <div
        style={{
          position: "absolute",
          width: elW,
          height: elH,
          left: (stripW - elW) / 2,
          top: (stripH - elH) / 2,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: filterParts || undefined,
          transform: `translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) scale(${t.scale.toFixed(4)}) rotate(${rotate}deg) scaleX(${fx}) scaleY(${fy})`,
          transformOrigin: "center center",
        }}
      />
      {grain ? (
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
