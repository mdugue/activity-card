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
import { Badge } from "@/components/ui/badge";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ColorScheme } from "@/lib/colors";
import {
  clampCoverTransform,
  type ImageTransform,
} from "@/lib/image-transform";
import { isQuarterTurn, type PhotoEffects } from "@/lib/photo-effects";

interface SingleCardPreviewProps {
  colors: ColorScheme;
  config: Record<string, unknown>;
  data: ActivityData;
  imageTransform: ImageTransform;
  onImageTransformChange: (next: ImageTransform) => void;
  photoBackdropEnabled: boolean;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  theme: ThemeId;
}

export function SingleCardPreview({
  data,
  theme,
  photoUrl,
  photoBackdropEnabled,
  colors,
  config,
  photoEffects,
  imageTransform,
  onImageTransformChange,
}: SingleCardPreviewProps) {
  const [adjusting, setAdjusting] = useState(false);

  // Natural photo size → a pan/zoom clamp that respects the photo's real cover
  // overflow on the 1080×1350 card. A quarter-turn swaps the photo's
  // width/height, so the clamp must use the rotated dimensions — the same
  // model as the carousel panorama.
  const imageSize = useImageNaturalSize(photoUrl);
  const quarter = isQuarterTurn(photoEffects.rotate);
  const coverClamp = imageSize
    ? (t: ImageTransform) =>
        clampCoverTransform(
          t,
          1080,
          1350,
          quarter ? imageSize.h : imageSize.w,
          quarter ? imageSize.w : imageSize.h
        )
    : undefined;

  // Repositioning is offered wherever the photo is actually on screen — any
  // theme, whenever the backdrop is toggled on — once its natural size is
  // known (the clamp depends on it). Drop out of adjust mode if it stops
  // being shown.
  const adjustAvailable =
    photoUrl !== null && photoBackdropEnabled && imageSize !== null;
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
            colors={colors}
            config={config}
            data={data}
            imageTransform={imageTransform}
            photoBackdropEnabled={photoBackdropEnabled}
            photoEffects={photoEffects}
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
            clamp={coverClamp}
            onChange={onImageTransformChange}
            onDone={() => setAdjusting(false)}
            transform={imageTransform}
          />
        ) : null}
      </div>
    </CardStage>
  );
}
