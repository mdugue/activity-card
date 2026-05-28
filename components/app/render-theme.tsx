import type { ActivityData } from "@/components/app/sample-data";
import { THEME_META, THEMES, type ThemeId } from "@/components/themes";
import { type AltitudeMood, ThemeAltitude } from "@/components/themes/altitude";
import { ThemePhoto } from "@/components/themes/photo";
import type { PaletteTheme } from "@/lib/palette";

export type { ThemeId } from "@/components/themes";

interface RenderThemeProps {
  altitudeMood?: AltitudeMood;
  data: ActivityData;
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
  altitudeMood,
  photoPaletteTheme = null,
}: RenderThemeProps) {
  const photo = effectivePhotoUrl(theme, photoUrl, photoBackdropEnabled);
  if (theme === "altitude") {
    return <ThemeAltitude data={data} mood={altitudeMood} photoUrl={photo} />;
  }
  if (theme === "photo") {
    return (
      <ThemePhoto
        data={data}
        paletteTheme={photoPaletteTheme}
        photoUrl={photo}
      />
    );
  }
  const Theme = THEMES[theme];
  return <Theme data={data} photoUrl={photo} />;
}
