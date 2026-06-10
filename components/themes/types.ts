import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";

export interface ThemeProps {
  data: ActivityData;
  /** Pan/zoom for the background photo — applied wherever a theme shows one. */
  imageTransform?: ImageTransform | null;
  photoUrl?: string | null;
}
