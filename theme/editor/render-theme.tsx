import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import type { ColorScheme } from "@/theme/core/colors";
import type { ExportFormat } from "@/theme/core/export-formats";
import { pickThemeData } from "@/theme/core/theme-contract";
import { FormatProvider, useFormat } from "@/theme/shared/format-context";
import { PhotoFxProvider } from "@/theme/shared/photo-fx";
import { SINGLE_CARD_THEMES, type ThemeId } from "@/theme/single-card";

export type { ThemeId } from "@/theme/single-card";

interface RenderThemeProps {
  /** the resolved colour scheme for the active theme (user choice or default) */
  colors?: ColorScheme;
  /** the active theme's coerced parameter config */
  config?: Record<string, unknown>;
  data: ActivityData;
  /** Target export format. The theme renders itself directly at this size and
   *  reads its dimensions + safe insets from the FormatContext. Falls back to the
   *  surrounding FormatContext (the 4:5 feed master when there's none), so a bare
   *  render matches the legacy canvas and a Storybook matrix decorator can supply
   *  the format per tile. */
  format?: ExportFormat;
  /** Pan/zoom applied to the background photo, wherever a theme shows one. */
  imageTransform?: ImageTransform | null;
  /** Whether the background photo shows (the `photoBackdrop` visibility flag). */
  photoBackdropEnabled?: boolean;
  /** Filter / grain / mirror, provided to every theme's photo layer via context. */
  photoEffects?: PhotoEffects | null;
  photoUrl?: string | null;
  theme: ThemeId;
}

/**
 * Dispatcher: looks the theme's descriptor up in the registry, strips the data
 * down to the theme's declared capabilities (`pickThemeData`, so the runtime
 * data matches the component's narrowed type), and provides the shared format +
 * photo-effects context. No per-theme branches and no Hybrid frame — every theme
 * is format-aware and renders itself at the target dimensions.
 */
export function RenderTheme({
  theme,
  data,
  photoUrl,
  photoBackdropEnabled = true,
  colors,
  config,
  photoEffects = null,
  imageTransform = null,
  format,
}: RenderThemeProps) {
  const descriptor = SINGLE_CARD_THEMES[theme];
  const ctxFormat = useFormat();
  const photo = photoBackdropEnabled ? (photoUrl ?? null) : null;
  // Natural size feeds the rotation-correct cover layer (quarter turns swap
  // the photo's width/height); derived here once so themes need no new props.
  const imageSize = useImageNaturalSize(photo);
  const Component = descriptor.Component;
  const resolvedColors = colors ?? descriptor.colors.default;
  const themeData = pickThemeData(descriptor, data);
  // An explicit prop wins; otherwise inherit the ambient FormatContext (which
  // itself defaults to the 4:5 feed master), so this composes inside a matrix
  // decorator that provides the format per tile.
  const activeFormat = format ?? ctxFormat;

  return (
    <FormatProvider value={activeFormat}>
      <PhotoFxProvider value={{ effects: photoEffects, imageSize }}>
        <Component
          colors={resolvedColors}
          config={config}
          data={themeData}
          imageTransform={imageTransform}
          photoUrl={photo}
        />
      </PhotoFxProvider>
    </FormatProvider>
  );
}
