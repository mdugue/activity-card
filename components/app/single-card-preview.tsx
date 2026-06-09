"use client";

// The Single Card preview: a static render of the active theme at full size,
// scaled into its container. The theme itself is chosen from the THEME tool in
// the ControlDeck, so the preview no longer doubles as a theme switcher — it
// just shows the result, the way the focused-toolbar design intends. Any theme
// showing a background photo gets an in-place "Adjust" affordance for pan/zoom.

import { ArrowsOutCardinalIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { CardStage } from "@/components/app/card-stage";
import { ImageAdjustOverlay } from "@/components/app/image-adjust-overlay";
import { RenderTheme, type ThemeId } from "@/components/app/render-theme";
import type { ActivityData } from "@/components/app/sample-data";
import { Badge } from "@/components/ui/badge";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import type { PhotoEffects } from "@/lib/photo-effects";

interface SingleCardPreviewProps {
  config: Record<string, unknown>;
  data: ActivityData;
  imageTransform: ImageTransform;
  onImageTransformChange: (next: ImageTransform) => void;
  photoBackdropEnabled: boolean;
  photoEffects: PhotoEffects;
  photoPaletteTheme: PaletteTheme | null;
  photoUrl: string | null;
  theme: ThemeId;
}

export function SingleCardPreview({
  data,
  theme,
  photoUrl,
  photoBackdropEnabled,
  config,
  photoEffects,
  photoPaletteTheme,
  imageTransform,
  onImageTransformChange,
}: SingleCardPreviewProps) {
  const [adjusting, setAdjusting] = useState(false);

  // Repositioning is offered wherever the photo is actually on screen — any
  // theme, whenever the backdrop is toggled on. Drop out of adjust mode if it
  // stops being shown.
  const adjustAvailable = photoUrl !== null && photoBackdropEnabled;
  useEffect(() => {
    if (adjusting && !adjustAvailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdjusting(false);
    }
  }, [adjusting, adjustAvailable]);

  return (
    <CardStage maxWidthClassName="max-w-[400px] lg:max-w-[460px]">
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
            config={config}
            data={data}
            imageTransform={imageTransform}
            photoBackdropEnabled={photoBackdropEnabled}
            photoEffects={photoEffects}
            photoPaletteTheme={photoPaletteTheme}
            photoUrl={photoUrl}
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
    </CardStage>
  );
}
