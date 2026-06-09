import type { ActivityData } from "@/components/app/sample-data";
import type { ImageTransform } from "@/lib/image-transform";

export interface ActivityCardProps {
  data: ActivityData;
  /** Pan/zoom for the background photo — applied wherever a theme shows one. */
  imageTransform?: ImageTransform | null;
  photoUrl?: string | null;
}
