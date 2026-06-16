import { SINGLE_CARD_THEMES, type ThemeId } from "@/components/themes";
import { FormatFrame } from "@/components/themes/shared/format-frame";
import { PhotoFxProvider } from "@/components/themes/shared/photo-fx";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ColorScheme } from "@/lib/colors";
import { type ExportFormat, isDefaultFormat } from "@/lib/export-formats";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { pickThemeData } from "@/lib/theme-contract";

export type { ThemeId } from "@/components/themes";

interface RenderThemeProps {
  /** the resolved colour scheme for the active theme (user choice or default) */
  colors?: ColorScheme;
  /** the active theme's coerced parameter config */
  config?: Record<string, unknown>;
  data: ActivityData;
  /** Target export format. When omitted (or the 4:5 master) the theme renders
   *  natively; any other format wraps it in the Hybrid {@link FormatFrame}. */
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
 * data matches the component's narrowed type), and provides the shared
 * photo-effects context. No per-theme branches — every theme takes the same
 * generic props; the photo is gated only by the `photoBackdrop` flag.
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
  const photo = photoBackdropEnabled ? (photoUrl ?? null) : null;
  // Natural size feeds the rotation-correct cover layer (quarter turns swap
  // the photo's width/height); derived here once so themes need no new props.
  const imageSize = useImageNaturalSize(photo);
  const Component = descriptor.Component;
  const resolvedColors = colors ?? descriptor.colors.default;
  const themeData = pickThemeData(descriptor, data);

  // The 4:5 master (or no format) renders natively — pixel-identical to legacy.
  const framed = format !== undefined && !isDefaultFormat(format.id);
  // Photo-led themes drop their OWN photo so the frame's single full-bleed photo
  // shows through (no seam); they keep their scrim + every element intact. The
  // frame reframes that intact composition as one unit.
  const surface =
    framed && descriptor.frame?.photoBleed ? "transparent" : "opaque";

  const component = (
    <Component
      colors={resolvedColors}
      config={config}
      data={themeData}
      imageTransform={imageTransform}
      photoUrl={photo}
      surface={surface}
    />
  );

  return (
    <PhotoFxProvider value={{ effects: photoEffects, imageSize }}>
      {framed && format ? (
        <FormatFrame
          colors={resolvedColors}
          format={format}
          frame={descriptor.frame}
          imageTransform={imageTransform}
          photoUrl={photo}
        >
          {component}
        </FormatFrame>
      ) : (
        <Component
          colors={resolvedColors}
          config={config}
          data={themeData}
          imageTransform={imageTransform}
          photoUrl={photo}
          surface="opaque"
        />
      )}
    </PhotoFxProvider>
  );
}
