import type { ComponentProps } from "react";
import type { ActivityData } from "@/components/app/sample-data";
import { type AltitudeMood, ThemeAltitude } from "@/components/themes/altitude";
import { ThemeData } from "@/components/themes/data";
import { ThemeEditorial } from "@/components/themes/editorial";
import { THEME_META } from "@/components/themes/index";
import { ThemePath } from "@/components/themes/path";
import { ThemePhoto } from "@/components/themes/photo";
import { ThemeTriathlon } from "@/components/themes/triathlon";
import type { PaletteTheme } from "@/lib/palette";

export type ThemeId =
  | "path"
  | "altitude"
  | "photo"
  | "data"
  | "editorial"
  | "triathlon";

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
  altitudeMood = "night",
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
  if (theme === "data") {
    return <ThemeData data={data} photoUrl={photo} />;
  }
  if (theme === "editorial") {
    return <ThemeEditorial data={data} photoUrl={photo} />;
  }
  if (theme === "triathlon") {
    return <ThemeTriathlon data={data} photoUrl={photo} />;
  }
  return <ThemePath data={data} photoUrl={photo} />;
}

// Keep the ActivityCardProps shape inferable from any theme component.
export type ThemeProps = ComponentProps<typeof ThemePath>;
