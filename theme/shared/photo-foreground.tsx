"use client";

// The near part of the background photo, for "text behind the horizon". A
// theme that offers the switch (theme/core/horizon) renders this right after
// the headline that should sit behind the landscape: it draws the photo's
// foreground cut-out with exactly the background layer's geometry, pan/zoom
// and filter, so the two line up pixel for pixel. Renders nothing while the
// switch is off or the cut-out isn't ready.
//
// Grain moves up here while the cut-out shows (PhotoLayer leaves it off), so
// it lies over sky, headline and landscape alike instead of stopping at the
// ridge.

import { IDENTITY_TRANSFORM } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";
import { NO_EFFECTS } from "@/lib/photo-effects";

import { CoverPhoto } from "./cover-photo";
import { useFormat } from "./format-context";
import {
  GrainOverlay,
  usePhotoEffects,
  usePhotoForegroundUrl,
  usePhotoImageSize,
} from "./photo-fx";

interface PhotoForegroundProps {
  imageTransform?: ImageTransform | null;
}

export const PhotoForeground = ({ imageTransform }: PhotoForegroundProps) => {
  const foregroundUrl = usePhotoForegroundUrl();
  const imageSize = usePhotoImageSize();
  const fx = usePhotoEffects() ?? NO_EFFECTS;
  const { width, height } = useFormat();
  if (foregroundUrl === null || imageSize === null) {
    return null;
  }
  return (
    <>
      <CoverPhoto
        boxH={height}
        boxW={width}
        effects={{ ...fx, grain: false }}
        foreground
        imageSize={imageSize}
        photoUrl={foregroundUrl}
        transform={imageTransform ?? IDENTITY_TRANSFORM}
      />
      {fx.grain ? <GrainOverlay /> : null}
    </>
  );
};
