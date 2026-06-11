// Shared full-bleed photo layer for the photo-led themes (Photo, Minimal,
// Altitude). When the photo's natural size is known (provided via the photo-fx
// context), it renders the rotation-correct `CoverPhoto`; until then it falls
// back to a plain CSS cover so the preview never flashes empty. Filter / grain /
// mirror come from the same context. Inline CSS only — html-to-image safe.

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
import { CoverPhoto } from "./cover-photo";
import { GrainOverlay, usePhotoEffects, usePhotoImageSize } from "./photo-fx";

const CARD_W = 1080;
const CARD_H = 1350;

interface PhotoLayerProps {
  imageTransform?: ImageTransform | null;
  photoUrl: string;
}

export function PhotoLayer({ photoUrl, imageTransform }: PhotoLayerProps) {
  const t = imageTransform ?? IDENTITY_TRANSFORM;
  const fx = usePhotoEffects();
  const imageSize = usePhotoImageSize();

  if (imageSize) {
    return (
      <CoverPhoto
        boxH={CARD_H}
        boxW={CARD_W}
        effects={fx}
        imageSize={imageSize}
        photoUrl={photoUrl}
        transform={t}
      />
    );
  }

  // Natural size unknown (loading, or rendered without the provider — e.g. a
  // bare story): plain CSS cover with the effects as a transform suffix.
  const filter = fx ? filterCss(fx.filter) : "";
  // A quarter-turn rotates a portrait cover box into a landscape footprint that
  // no longer fills the box vertically; over-size the layer so the corners stay
  // covered (matching PhotoBackdrop / PhotoUnderlay) until CoverPhoto takes over.
  const bleed = fx && isQuarterTurn(fx.rotate) ? -160 : 0;
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
          inset: bleed,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: filter || undefined,
          transform: `${transformToCss(t)}${effectsTransformSuffix(fx)}`,
          transformOrigin: "center center",
        }}
      />
      {fx?.grain ? <GrainOverlay /> : null}
    </div>
  );
}
