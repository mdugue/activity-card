// Shared full-bleed photo layer for "hero" themes (Photo, Minimal). The image
// is rendered as a CSS background on a div sized to the whole card, with the
// user's pan/zoom applied as a transform. Background-image (not <img>) keeps
// next/image out of the way for blob URLs and matches the PhotoBackdrop
// approach used by "supports" themes. Transform is plain CSS — html-to-image
// captures it faithfully (unlike backdrop-filter).

import {
  IDENTITY_TRANSFORM,
  type ImageTransform,
  transformToCss,
} from "@/lib/image-transform";

interface PhotoLayerProps {
  imageTransform?: ImageTransform | null;
  photoUrl: string;
}

export function PhotoLayer({ photoUrl, imageTransform }: PhotoLayerProps) {
  const t = imageTransform ?? IDENTITY_TRANSFORM;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: transformToCss(t),
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
