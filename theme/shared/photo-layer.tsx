// Shared full-bleed photo layer for the photo-led themes (Photo,
// Altitude). When the photo's natural size is known (provided via the photo-fx
// context), it renders the rotation-correct `CoverPhoto`; until then it falls
// back to a plain CSS cover so the preview never flashes empty. Filter / grain /
// mirror come from the same context. Inline CSS only — snapdom safe.

import { IDENTITY_TRANSFORM, type ImageTransform } from "@/lib/image-transform";
import { CoverPhoto } from "./cover-photo";
import { useFormat } from "./format-context";
import {
  CssCoverImage,
  GrainOverlay,
  usePhotoEffects,
  usePhotoImageSize,
} from "./photo-fx";

interface PhotoLayerProps {
  imageTransform?: ImageTransform | null;
  photoUrl: string;
}

export function PhotoLayer({ photoUrl, imageTransform }: PhotoLayerProps) {
  const t = imageTransform ?? IDENTITY_TRANSFORM;
  const fx = usePhotoEffects();
  const imageSize = usePhotoImageSize();
  const { width, height } = useFormat();

  if (imageSize) {
    return (
      <CoverPhoto
        boxH={height}
        boxW={width}
        effects={fx}
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
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <CssCoverImage imageTransform={t} photoUrl={photoUrl} />
      {fx?.grain ? <GrainOverlay /> : null}
    </div>
  );
}
