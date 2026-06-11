// Faint full-bleed photo underlay for the dense, light themes (Data, Triathlon).
// It sits at z-index -1 — above the theme's solid background, below all of its
// content — so it drops into a `position: relative` root without rewrapping the
// layout. A strong paper scrim keeps busy data legible; the photo reads as a
// subtle wash. background-image + inline `filter` (never backdrop-filter) so
// html-to-image captures it faithfully.

import {
  IDENTITY_TRANSFORM,
  type ImageTransform,
  transformToCss,
} from "@/lib/image-transform";
import {
  effectsTransformSuffix,
  filterCss,
  isQuarterTurn,
} from "@/lib/photo-effects";
import { usePhotoEffects } from "./photo-fx";

interface PhotoUnderlayProps {
  imageTransform?: ImageTransform | null;
  photoUrl: string;
}

export function PhotoUnderlay({
  photoUrl,
  imageTransform,
}: PhotoUnderlayProps) {
  const fx = usePhotoEffects();
  const userFilter = fx ? filterCss(fx.filter) : "";
  // Quarter-turn bleed — see PhotoBackdrop.
  const bleed = fx && isQuarterTurn(fx.rotate) ? -160 : 0;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: bleed,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `${transformToCss(imageTransform ?? IDENTITY_TRANSFORM)}${effectsTransformSuffix(fx)}`,
          transformOrigin: "center center",
          filter: `saturate(0.92) ${userFilter}`.trim(),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.74) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.78) 80%, rgba(255,255,255,0.92) 100%)",
        }}
      />
    </div>
  );
}
