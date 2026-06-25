"use client";

// The carousel's <PhotoBackdrop>: a photo layer ANY panel or canvas can render,
// positioned in STRIP coordinates so a per-slide component still yields a
// seamless spanning image. It draws the one shared photo (a CoverPhoto sized to
// the WHOLE strip) inside the slide's overflow-hidden box, translated
// -index*slideW, so adjacent slides show adjacent windows and the seam aligns.
//
// This un-hoards the photo: instead of the deck painting one flat layer under
// everything (so panels must be pure foreground), a panel composes the photo
// into its OWN z-stack —
//
//   <Panorama layer="back" /> → text → <Panorama layer="subject" mask={…} />
//
// — so content can sit BETWEEN the background and a masked subject ("text behind
// the mountain, in front of the sky"). The fg/bg split is the same source at the
// same strip position drawn twice with two masks; both are positioned in strip
// coords, so the seam still aligns. (Subject segmentation is a later feature;
// Panorama just accepts a mask/layer.)
//
// Effects / natural size / source / transform come from the PhotoFx context the
// deck provides — no prop-threading. Renders null when no photo is shown.

import type { CSSProperties } from "react";
import type { ImageTransform } from "@/lib/image-transform";
import { CoverPhoto } from "@/theme/shared/cover-photo";
import { usePhotoFx } from "@/theme/shared/photo-fx";
import { useStripGeometry } from "./geometry";

interface PanoramaProps {
  /** extra CSS filter prepended before the user preset (e.g. desaturate) */
  extraFilter?: string;
  /** override the context transform (rare — the deck's is the default) */
  imageTransform?: ImageTransform | null;
  /** this slide's index in the strip (the panel's own `index`) */
  index: number;
  /** "back" (default) = full backdrop; "subject" = a masked copy the panel draws
   *  ON TOP of content so the content tucks behind the masked subject. */
  layer?: "back" | "subject";
  /** CSS mask (e.g. `url(...)` or a gradient) — the subject layer's cut-out */
  mask?: string;
  opacity?: number;
  /** total slides in the strip (the panel's `total`) */
  total: number;
}

export function Panorama({
  index,
  total,
  layer = "back",
  mask,
  opacity,
  extraFilter,
  imageTransform,
}: PanoramaProps) {
  const {
    effects,
    imageSize,
    photoUrl,
    imageTransform: ctxTransform,
  } = usePhotoFx();
  const { slideW, slideH, stripW } = useStripGeometry(total);
  if (!(photoUrl && imageSize)) {
    return null;
  }
  const maskStyle: CSSProperties = mask
    ? {
        maskImage: mask,
        WebkitMaskImage: mask,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      }
    : {};
  return (
    <div
      aria-hidden
      data-panorama-layer={layer}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        ...maskStyle,
      }}
    >
      {/* The full strip-wide image, shifted so THIS slide's window shows — every
          slide positions the same image at the same strip coords, so the seam
          continues unbroken across slide edges. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: -index * slideW,
          width: stripW,
          height: slideH,
        }}
      >
        <CoverPhoto
          boxH={slideH}
          boxW={stripW}
          effects={effects}
          extraFilter={extraFilter}
          imageSize={imageSize}
          opacity={opacity}
          photoUrl={photoUrl}
          transform={imageTransform ?? ctxTransform}
        />
      </div>
    </div>
  );
}
