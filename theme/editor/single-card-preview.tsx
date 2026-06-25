"use client";

// The Single Card preview: a static render of the active theme, scaled into its
// container. The target format and the Safe-zones overlay are driven from the
// FORMAT tool in the dock (so the preview area stays clear of the focused
// toolbar on mobile). Any theme showing a background photo gets an in-place
// "Adjust" affordance for pan/zoom, available at every format — the pan clamp is
// derived from the active format's own cover overflow.

import { ArrowsOutCardinalIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { CardStage } from "@/components/app/card-stage";
import { Badge } from "@/components/ui/badge";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import {
  clampCoverTransform,
  type ImageTransform,
} from "@/lib/image-transform";
import { isQuarterTurn, type PhotoEffects } from "@/lib/photo-effects";
import type { ColorScheme } from "@/theme/core/colors";
import type { ExportFormat } from "@/theme/core/export-formats";
import { ImageAdjustOverlay } from "@/theme/editor/image-adjust-overlay";
import { RenderTheme, type ThemeId } from "@/theme/editor/render-theme";
import { SafeZoneOverlay } from "@/theme/editor/safe-zone-overlay";

interface SingleCardPreviewProps {
  colors: ColorScheme;
  config: Record<string, unknown>;
  data: ActivityData;
  /** target format the theme renders itself into (chosen in the FORMAT tool) */
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

  // Natural photo size → a pan/zoom clamp that respects the photo's real cover
  // overflow on the ACTIVE format's box (not a fixed 4:5), so Adjust works at
  // every target. A quarter-turn swaps the photo's width/height, so the clamp
  // must use the rotated dimensions.
  const imageSize = useImageNaturalSize(photoUrl);
  const quarter = isQuarterTurn(photoEffects.rotate);
  const coverClamp = imageSize
    ? (t: ImageTransform) =>
        clampCoverTransform(
          t,
          format.width,
          format.height,
          quarter ? imageSize.h : imageSize.w,
          quarter ? imageSize.w : imageSize.h
        )
    : undefined;

  // Adjust makes sense whenever the photo is shown and its natural size is
  // known (the clamp is derived from it) — at any format.
  const adjustAvailable =
    photoUrl !== null && photoBackdropEnabled && imageSize !== null;
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
