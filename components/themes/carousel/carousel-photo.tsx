// Carousel panorama photo — the shared natural-size-aware `CoverPhoto` drawn
// across the wide strip, with the deck's desaturate treatment composed in
// front of the user filter. Clamp lives in `clampCoverTransform` (which must
// be fed the rotation-swapped dimensions).

import { CoverPhoto } from "@/components/themes/shared/cover-photo";
import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";

interface CarouselPhotoProps {
  desaturate?: boolean;
  effects?: PhotoEffects | null;
  imageSize: ImageSize;
  /** light themes render the panorama as a faint texture */
  opacity?: number;
  photoUrl: string;
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
  effects,
}: CarouselPhotoProps) {
  return (
    <CoverPhoto
      boxH={stripH}
      boxW={stripW}
      effects={effects}
      extraFilter={desaturate ? "saturate(0.6) brightness(1.05)" : undefined}
      imageSize={imageSize}
      opacity={opacity}
      photoUrl={photoUrl}
      transform={transform}
    />
  );
}
