// Faint full-bleed photo underlay for the dense, light themes (Data, Triathlon).
// It sits at z-index -1 — above the theme's solid background, below all of its
// content — so it drops into a `position: relative` root without rewrapping the
// layout. A strong paper scrim keeps busy data legible; the photo reads as a
// subtle wash. background-image + inline `filter` (never backdrop-filter) so
// snapdom captures it faithfully.

import type { ImageTransform } from "@/lib/image-transform";

import { CssCoverImage } from "./photo-fx";

interface PhotoUnderlayProps {
  imageTransform?: ImageTransform | null;
  photoUrl: string;
}

export const PhotoUnderlay = ({
  photoUrl,
  imageTransform,
}: PhotoUnderlayProps) => (
  <div
    aria-hidden
    style={{
      inset: 0,
      overflow: "hidden",
      pointerEvents: "none",
      position: "absolute",
      zIndex: -1,
    }}
  >
    <CssCoverImage
      filterPrefix="saturate(0.92)"
      imageTransform={imageTransform}
      photoUrl={photoUrl}
    />
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.74) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.78) 80%, rgba(255,255,255,0.92) 100%)",
        inset: 0,
        position: "absolute",
      }}
    />
  </div>
);
