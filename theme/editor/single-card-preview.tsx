"use client";

// The Single Card preview: a static render of the active theme, scaled into its
// container. The target format and the Safe-zones overlay are driven from the
// FORMAT tool in the dock (so the preview area stays clear of the focused
// toolbar on mobile). Any theme showing a background photo gets an in-place
// "Adjust" affordance for pan/zoom, available at every format — the pan clamp is
// derived from the active format's own cover overflow.

import { CardStage } from "@/components/app/card-stage";
import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import type { ColorScheme } from "@/theme/core/colors";
import type { ExportFormat } from "@/theme/core/export-formats";
import { RenderTheme, type ThemeId } from "@/theme/editor/render-theme";
import { SafeZoneOverlay } from "@/theme/editor/safe-zone-overlay";
import { AdjustControls, usePhotoAdjust } from "./photo-adjust";

interface SingleCardPreviewProps {
  colors: ColorScheme;
  config: Record<string, unknown>;
  data: ActivityData;
  /** target format the theme renders itself into (chosen in the FORMAT tool) */
  format: ExportFormat;
  imageTransform: ImageTransform;
  onImageTransformChange: (next: ImageTransform) => void;
  photo: boolean;
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
  photo,
  colors,
  config,
  photoEffects,
  imageTransform,
  onImageTransformChange,
}: SingleCardPreviewProps) {
  // The pan/zoom clamp follows the active format's box, so Adjust works at every
  // target (not just the 4:5 master).
  const adjust = usePhotoAdjust({
    boxW: format.width,
    boxH: format.height,
    enabled: photo,
    photoUrl,
    rotate: photoEffects.rotate,
  });

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
            photo={photo}
            photoEffects={photoEffects}
            photoUrl={photoUrl}
            theme={theme}
          />
          {/* Inside the scaled node → format-space px (scale 1), scaled to the
              display size by the same CSS transform as the card. */}
          {showSafe ? <SafeZoneOverlay format={format} scale={1} /> : null}
        </div>

        <AdjustControls
          adjust={adjust}
          contentWidth={format.width}
          label="Adjust"
          onChange={onImageTransformChange}
          transform={imageTransform}
        />
      </div>
    </CardStage>
  );
}
