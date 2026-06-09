import type { ActivityData } from "@/components/app/sample-data";
import { THEMES, type ThemeId } from "@/components/themes";
import { ThemeAltitude } from "@/components/themes/altitude";
import { ThemePhoto } from "@/components/themes/photo";
import { PhotoEffectsProvider } from "@/components/themes/photo-fx";
import { ThemeStrata } from "@/components/themes/strata";
import type { AltitudeConfig } from "@/lib/altitude";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import type { PhotoEffects } from "@/lib/photo-effects";
import type { StrataConfig } from "@/lib/strata";

export type { ThemeId } from "@/components/themes";

interface RenderThemeProps {
  /** the active theme's coerced parameter config (StrataConfig / AltitudeConfig
   *  for those themes; ignored by the rest) */
  config?: Record<string, unknown>;
  data: ActivityData;
  /** Pan/zoom applied to the background photo, wherever a theme shows one. */
  imageTransform?: ImageTransform | null;
  /** Whether the background photo shows (the `photoBackdrop` visibility flag). */
  photoBackdropEnabled?: boolean;
  /** Filter / grain / mirror, provided to every theme's photo layer via context. */
  photoEffects?: PhotoEffects | null;
  /** Photo theme: pre-resolved palette extracted from the photo, if available. */
  photoPaletteTheme?: PaletteTheme | null;
  photoUrl?: string | null;
  theme: ThemeId;
}

/** Dispatcher: picks the right theme component for the given id and provides the
 *  shared photo-effects context. Every theme now accepts a background photo,
 *  gated only by the `photoBackdrop` visibility flag. */
export function RenderTheme({
  theme,
  data,
  photoUrl,
  photoBackdropEnabled = true,
  config,
  photoPaletteTheme = null,
  photoEffects = null,
  imageTransform = null,
}: RenderThemeProps) {
  const photo = photoBackdropEnabled ? (photoUrl ?? null) : null;

  let inner: React.ReactNode;
  if (theme === "strata") {
    inner = (
      <ThemeStrata
        config={config as StrataConfig | undefined}
        data={data}
        imageTransform={imageTransform}
        photoUrl={photo}
      />
    );
  } else if (theme === "altitude") {
    inner = (
      <ThemeAltitude
        config={config as AltitudeConfig | undefined}
        data={data}
        imageTransform={imageTransform}
        photoUrl={photo}
      />
    );
  } else if (theme === "photo") {
    inner = (
      <ThemePhoto
        data={data}
        imageTransform={imageTransform}
        paletteTheme={photoPaletteTheme}
        photoUrl={photo}
      />
    );
  } else {
    const Theme = THEMES[theme];
    inner = (
      <Theme data={data} imageTransform={imageTransform} photoUrl={photo} />
    );
  }

  return (
    <PhotoEffectsProvider value={photoEffects}>{inner}</PhotoEffectsProvider>
  );
}
