"use client";

// The Single Card preview: a static render of the active theme at full size,
// scaled into its container. The theme itself is chosen from the THEME tool in
// the ControlDeck, so the preview no longer doubles as a theme switcher — it
// just shows the result, the way the focused-toolbar design intends. Hero photo
// themes still get an in-place "Adjust" affordance for pan/zoom.

import { ArrowsOutCardinalIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ImageAdjustOverlay } from "@/components/app/image-adjust-overlay";
import { RenderTheme, type ThemeId } from "@/components/app/render-theme";
import type { ActivityData } from "@/components/app/sample-data";
import { THEME_META } from "@/components/themes/index";
import { Badge } from "@/components/ui/badge";
import type { AltitudeConfig } from "@/lib/altitude";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import type { StrataConfig } from "@/lib/strata";

interface SingleCardPreviewProps {
  altitudeConfig: AltitudeConfig;
  data: ActivityData;
  imageTransform: ImageTransform;
  onImageTransformChange: (next: ImageTransform) => void;
  photoBackdropEnabled: boolean;
  photoPaletteTheme: PaletteTheme | null;
  photoUrl: string | null;
  strataConfig: StrataConfig;
  theme: ThemeId;
}

export function SingleCardPreview({
  data,
  theme,
  photoUrl,
  photoBackdropEnabled,
  altitudeConfig,
  strataConfig,
  photoPaletteTheme,
  imageTransform,
  onImageTransformChange,
}: SingleCardPreviewProps) {
  const [adjusting, setAdjusting] = useState(false);

  // Repositioning is only meaningful when the active theme shows the photo as
  // its hero. Drop out of adjust mode if the photo is removed or the theme
  // changes to one that doesn't feature it.
  const adjustAvailable =
    photoUrl !== null && THEME_META[theme].photoMode === "hero";
  useEffect(() => {
    if (adjusting && !adjustAvailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdjusting(false);
    }
  }, [adjusting, adjustAvailable]);

  return (
    <div className="relative mx-auto w-full max-w-[400px] lg:max-w-[460px]">
      <div className="@container relative aspect-[1080/1350] w-full overflow-hidden bg-white shadow-2xl">
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            width: 1080,
            height: 1350,
            transform: "scale(calc(100cqw / 1080px))",
          }}
        >
          <RenderTheme
            altitudeConfig={altitudeConfig}
            data={data}
            imageTransform={imageTransform}
            photoBackdropEnabled={photoBackdropEnabled}
            photoPaletteTheme={photoPaletteTheme}
            photoUrl={photoUrl}
            strataConfig={strataConfig}
            theme={theme}
          />
        </div>

        {adjustAvailable && !adjusting ? (
          <Badge
            className="absolute top-3 right-3 z-10 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[10px] text-white backdrop-blur-sm transition-colors hover:bg-black/75"
            render={<button onClick={() => setAdjusting(true)} type="button" />}
          >
            <ArrowsOutCardinalIcon
              aria-hidden
              className="size-3"
              weight="duotone"
            />
            Adjust
          </Badge>
        ) : null}

        {adjusting ? (
          <ImageAdjustOverlay
            onChange={onImageTransformChange}
            onDone={() => setAdjusting(false)}
            transform={imageTransform}
          />
        ) : null}
      </div>
    </div>
  );
}
