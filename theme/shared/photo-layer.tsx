// Shared full-bleed photo layer for the photo-led themes (Photo, Altitude, the
// woven family). When the photo's natural size is known (provided via the
// photo-fx context), it renders the rotation-correct `CoverPhoto`; until then
// it falls back to a plain CSS cover so the preview never flashes empty.
// Filter / grain / mirror come from the same context. Inline CSS only —
// snapdom safe.
//
// A theme may stack several copies of the photo, each with its own `filter`
// and `clip` (e.g. a toned copy under a colour copy cut to the route). Every
// copy publishes its own export descriptor, so the WebKit compositor rebuilds
// the stack exactly — unlike a `mix-blend-mode` layer, which it cannot.

import { IDENTITY_TRANSFORM } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";

import { CoverPhoto } from "./cover-photo";
import { useFormat } from "./format-context";
import {
  CssCoverImage,
  GrainOverlay,
  usePhotoEffects,
  usePhotoImageSize,
} from "./photo-fx";

interface PhotoLayerProps {
  /** SVG path data (card px, nonzero) the copy is clipped to; "" = no clip */
  clip?: string;
  /** a CSS colour filter applied before the user's preset (e.g. grayscale) */
  filter?: string;
  /** draw the user's grain on this copy (default on; off for extra copies) */
  grain?: boolean;
  imageTransform?: ImageTransform | null;
  photoUrl: string;
}

export const PhotoLayer = ({
  clip = "",
  filter = "",
  grain = true,
  photoUrl,
  imageTransform,
}: PhotoLayerProps) => {
  const t = imageTransform ?? IDENTITY_TRANSFORM;
  const fx = usePhotoEffects();
  const imageSize = usePhotoImageSize();
  const { width, height } = useFormat();

  if (imageSize) {
    return (
      <CoverPhoto
        boxH={height}
        boxW={width}
        clip={clip}
        effects={fx}
        extraFilter={filter}
        grain={grain}
        imageSize={imageSize}
        photoUrl={photoUrl}
        transform={t}
      />
    );
  }

  // Natural size unknown (loading, or rendered without the provider — e.g. a
  // bare story): plain CSS cover with the effects as a transform suffix.
  return (
    <div
      aria-hidden
      style={{
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        position: "absolute",
      }}
    >
      <CssCoverImage
        clip={clip}
        filterPrefix={filter}
        imageTransform={t}
        photoUrl={photoUrl}
      />
      {fx?.grain === true && grain ? <GrainOverlay /> : null}
    </div>
  );
};
