"use client";

// The Single Card preview: a static render of the active theme, scaled into its
// container. The target format and the Safe-zones overlay are driven from the
// FORMAT tool in the dock (so the preview area stays clear of the focused
// toolbar on mobile). Any theme showing a background photo gets an in-place
// "Adjust" affordance for pan/zoom, available at every format — the pan clamp is
// derived from the active format's own cover overflow.

import type { CSSProperties } from "react";

import { CardStage } from "@/components/app/card-stage";
import type { ActivityData } from "@/lib/activity";
import {
  artConfigFrom,
  artPlacement,
  clampArtPlacement,
  hasArtPlacement,
} from "@/lib/art-placement";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import type { ColorScheme } from "@/theme/core/colors";
import type { ExportFormat } from "@/theme/core/export-formats";
import type { ParamDef, ThemeConfig } from "@/theme/core/params/kinds";
import { RenderTheme } from "@/theme/editor/render-theme";
import type { ThemeId } from "@/theme/editor/render-theme";
import { SafeZoneOverlay } from "@/theme/editor/safe-zone-overlay";

import { AdjustControls, usePhotoAdjust } from "./photo-adjust";
import type { ArtAdjust } from "./photo-adjust";

/** The active format's geometry, carried as CSS custom properties. */
interface FormatFitStyle extends CSSProperties {
  "--fmt-fit": string;
  "--fmt-h": string;
  "--fmt-ratio": string;
  "--fmt-w": string;
}

interface SingleCardPreviewProps {
  colors: ColorScheme;
  config: ThemeConfig;
  data: ActivityData;
  /** target format the theme renders itself into (chosen in the FORMAT tool) */
  format: ExportFormat;
  imageTransform: ImageTransform;
  onConfigChange: (next: ThemeConfig) => void;
  onImageTransformChange: (next: ImageTransform) => void;
  /** the active theme's params — a theme declaring `ART_PARAMS` gets the
   *  on-card Graphic adjust */
  params: ParamDef[];
  photoBackdropEnabled: boolean;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  /** overlay the platform keep-out guides (toggled in the FORMAT tool) */
  showSafe: boolean;
  theme: ThemeId;
}

export const SingleCardPreview = ({
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
  onConfigChange,
  onImageTransformChange,
  params,
}: SingleCardPreviewProps) => {
  // The theme's graphic placement lives in its config (artX / artY /
  // artScale); the Adjust gesture edits it as a transform in format px.
  const { width: fw, height: fh } = format;
  const art: ArtAdjust | undefined = hasArtPlacement(params)
    ? {
        clamp: (t) => clampArtPlacement(t, fw, fh),
        onChange: (t) => {
          onConfigChange({ ...config, ...artConfigFrom(t, fw, fh) });
        },
        transform: artPlacement(config, fw, fh),
      }
    : undefined;
  // The pan/zoom clamp follows the active format's box, so Adjust works at every
  // target (not just the 4:5 master).
  const adjust = usePhotoAdjust({
    boxH: format.height,
    boxW: format.width,
    enabled: photoBackdropEnabled,
    hasArt: art !== undefined,
    photoUrl,
    rotate: photoEffects.rotate,
  });

  // The format's master size rides CSS custom properties; the inner node is
  // laid out at that size and scaled down to the container's width.
  const style: FormatFitStyle = {
    "--fmt-fit": `scale(calc(100cqw / ${format.width}px))`,
    "--fmt-h": `${format.height}px`,
    "--fmt-ratio": `${format.width} / ${format.height}`,
    "--fmt-w": `${format.width}px`,
  };

  return (
    <CardStage
      aspectRatio={format.width / format.height}
      maxWidthClassName="max-w-[400px] lg:max-w-[460px]"
    >
      <div
        className="@container relative aspect-(--fmt-ratio) w-full overflow-hidden bg-white shadow-2xl"
        style={style}
      >
        <div className="absolute inset-0 h-(--fmt-h) w-(--fmt-w) origin-top-left transform-(--fmt-fit)">
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

        <AdjustControls
          adjust={adjust}
          art={art}
          contentWidth={format.width}
          label="Adjust"
          onChange={onImageTransformChange}
          transform={imageTransform}
        />
      </div>
    </CardStage>
  );
};
