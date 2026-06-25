"use client";

// The carousel's <PhotoBackdrop>: a photo layer any panel/canvas can render,
// positioned in STRIP coordinates so a per-slide component still yields a
// seamless spanning image (the same source, shifted -index*slideW inside the
// slide's overflow-hidden box). Draw it twice with two masks to interweave
// content between background and a masked subject — both align because both sit
// in strip coords. Effects / source / size come from the PhotoFx context the
// deck provides (no prop-threading); null when no photo is shown.

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
  /** CSS mask (e.g. a gradient) — cuts the layer to a subject the panel draws
   *  over content, so the content tucks behind it */
  mask?: string;
  opacity?: number;
  /** total slides in the strip (the panel's `total`) */
  total: number;
}

export function Panorama({
  index,
  total,
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
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        ...maskStyle,
      }}
    >
      {/* the full strip-wide image, shifted so THIS slide's window shows — every
          slide positions the same source, so the seam continues across edges */}
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
