"use client";

// The Single Card preview: a static render of the active theme, scaled into its
// container. The target format and the Safe-zones overlay are driven from the
// FORMAT tool in the dock (so the preview area stays clear of the focused
// toolbar on mobile). Any theme showing a background photo gets an in-place
// "Adjust" affordance for pan/zoom (4:5 master only, where card-space pan maps
// 1:1).

import { ArrowsOutCardinalIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { CardStage } from "@/components/app/card-stage";
import { ImageAdjustOverlay } from "@/components/app/image-adjust-overlay";
import { RenderTheme, type ThemeId } from "@/components/app/render-theme";
import { SafeZoneOverlay } from "@/components/app/safe-zone-overlay";
import { Badge } from "@/components/ui/badge";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ColorScheme } from "@/lib/colors";
import { type ExportFormat, isDefaultFormat } from "@/lib/export-formats";
import {
  clampCoverTransform,
  type ImageTransform,
} from "@/lib/image-transform";
import { isQuarterTurn, type PhotoEffects } from "@/lib/photo-effects";

interface SingleCardPreviewProps {
  colors: ColorScheme;
  config: Record<string, unknown>;
  data: ActivityData;
  /** target format previewed via the Hybrid frame (chosen in the FORMAT tool) */
  format: ExportFormat;
  imageTransform: ImageTransform;
  onImageTransformChange: (next: ImageTransform) => void;
  photoBackdropEnabled: boolean;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  /** overlay the platform keep-out guides (toggled in the FORMAT tool) */
  showSafe: boolean;
  theme: ThemeId;
}

export function SingleCardPreview({
  data,
  theme,
  format,
  showSafe,
  photoUrl,
  photoBackdropEnabled,
  colors,
  config,
  photoEffects,
  imageTransform,
  onImageTransformChange,
}: SingleCardPreviewProps) {
  const [adjusting, setAdjusting] = useState(false);

  const isDefault = isDefaultFormat(format.id);

  // Natural photo size → a pan/zoom clamp that respects the photo's real cover
  // overflow on the 1080×1350 card. A quarter-turn swaps the photo's
  // width/height, so the clamp must use the rotated dimensions.
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

  // Pan/zoom maps 1:1 only on the 4:5 master; hide it on retargeted formats.
  const adjustAvailable =
    isDefault &&
    photoUrl !== null &&
    photoBackdropEnabled &&
    imageSize !== null;
  useEffect(() => {
    if (adjusting && !adjustAvailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdjusting(false);
    }
  }, [adjusting, adjustAvailable]);

  return (
    <CardStage
      aspectRatio={format.width / format.height}
      maxWidthClassName="max-w-[400px] lg:max-w-[460px]"
    >
      <div
        className="@container relative w-full overflow-hidden bg-white shadow-2xl"
        style={{ aspectRatio: `${format.width} / ${format.height}` }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            width: format.width,
            height: format.height,
            transform: `scale(calc(100cqw / ${format.width}px))`,
          }}
        >
          <RenderTheme
            colors={colors}
            config={config}
            data={data}
            format={format}
            imageTransform={imageTransform}
            photoBackdropEnabled={photoBackdropEnabled}
            photoEffects={photoEffects}
            photoUrl={photoUrl}
            theme={theme}
          />
          {/* Inside the scaled node → format-space px (scale 1), scaled to the
              display size by the same CSS transform as the card. */}
          {showSafe ? <SafeZoneOverlay format={format} scale={1} /> : null}
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
