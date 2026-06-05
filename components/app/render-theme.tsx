import type { ActivityData } from "@/components/app/sample-data";
import { THEME_META, THEMES, type ThemeId } from "@/components/themes";
import { ThemeAltitude } from "@/components/themes/altitude";
import { ThemeMinimal } from "@/components/themes/minimal";
import { ThemePhoto } from "@/components/themes/photo";
import type { AltitudeConfig } from "@/lib/altitude";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";

export type { ThemeId } from "@/components/themes";

interface RenderThemeProps {
  altitudeConfig?: AltitudeConfig;
  data: ActivityData;
  /** Pan/zoom applied to the background photo in "hero" themes. */
  imageTransform?: ImageTransform | null;
  photoBackdropEnabled?: boolean;
  /** Photo theme: pre-resolved palette extracted from the photo, if available. */
  photoPaletteTheme?: PaletteTheme | null;
  photoUrl?: string | null;
  theme: ThemeId;
}

/**
 * Compute the effective photo URL handed to a theme. `hero` themes always get
 * the photo; `supports` themes only get it if the user hasn't disabled the
 * backdrop; `none` themes never get it.
 */
function effectivePhotoUrl(
  theme: ThemeId,
  photoUrl: string | null | undefined,
  backdropEnabled: boolean
): string | null {
  if (!photoUrl) {
    return null;
  }
  const meta = THEME_META[theme];
  if (meta.photoMode === "hero") {
    return photoUrl;
  }
  if (meta.photoMode === "supports" && backdropEnabled) {
    return photoUrl;
  }
  return null;
}

/** Dispatcher: picks the right theme component for the given id. */
export function RenderTheme({
  theme,
  data,
  photoUrl,
  photoBackdropEnabled = true,
  altitudeConfig,
  photoPaletteTheme = null,
  imageTransform = null,
}: RenderThemeProps) {
  const photo = effectivePhotoUrl(theme, photoUrl, photoBackdropEnabled);
  if (theme === "altitude") {
    return (
      <ThemeAltitude
        config={altitudeConfig}
        data={data}
        imageTransform={imageTransform}
        photoUrl={photo}
      />
    );
  }
  if (theme === "photo") {
    return (
      <ThemePhoto
        data={data}
        imageTransform={imageTransform}
        paletteTheme={photoPaletteTheme}
        photoUrl={photo}
      />
    );
  }
  if (theme === "minimal") {
    return (
      <ThemeMinimal
        data={data}
        imageTransform={imageTransform}
        photoUrl={photo}
      />
    );
  }
  const Theme = THEMES[theme];
  return <Theme data={data} photoUrl={photo} />;
}
