"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { SINGLE_CARD_THEMES, THEME_ORDER } from "@/components/themes/index";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ActivityData, Sport } from "@/lib/activity";
import type { ColorChoice, ColorScheme } from "@/lib/colors";
import { defaultFilename, exportCard } from "@/lib/export-card";
import type { ImageTransform } from "@/lib/image-transform";
import type { ExtractedPalette } from "@/lib/palette";
import type { ParamDef } from "@/lib/params/kinds";
import type { ParsedActivity } from "@/lib/parse-activity";
import type { PhotoEffects } from "@/lib/photo-effects";
import type { Visibility } from "@/lib/visibility";
import { useActivityTools } from "./activity-tools";
import { ControlDeck } from "./control-deck";
import { RenderTheme, type ThemeId } from "./render-theme";
import { SingleCardPreview } from "./single-card-preview";
import { ThemeRail } from "./theme-rail";

interface EditStateProps {
  athleteName: string;
  available: Record<keyof Visibility, boolean>;
  /** show the COLOUR control (hidden for fixed-palette themes) */
  colorAdjustable: boolean;
  /** the effective colour choice (theme default until the user picks) */
  colorChoice: ColorChoice;
  /** true while the user hasn't customised the colour */
  colorIsDefault: boolean;
  /** the resolved colour scheme the theme renders with */
  colors: ColorScheme;
  /** the active theme's coerced parameter config */
  config: Record<string, unknown>;
  data: ActivityData;
  imageTransform: ImageTransform;
  location: string;
  onAthleteNameChange: (name: string) => void;
  onColorChoiceChange: (choice: ColorChoice | null) => void;
  onConfigChange: (next: Record<string, unknown>) => void;
  onDownload: () => void;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onImageTransformChange: (next: ImageTransform) => void;
  onLocationChange: (location: string) => void;
  onOpenStravaPicker: () => void;
  onPhotoChange: (file: File | null) => void;
  onPhotoEffectsChange: (next: PhotoEffects) => void;
  onSportChange: (sport: Sport) => void;
  onThemeChange: (theme: ThemeId) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  /** all five palette presets — colour-control swatches + calculated params */
  paramPalette: ExtractedPalette | null;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  theme: ThemeId;
  /** the active theme's parameter schema */
  themeParams: ParamDef[];
  title: string;
  visibility: Visibility;
}

export function EditState(props: EditStateProps) {
  const {
    data,
    theme,
    photoUrl,
    photoEffects,
    paramPalette,
    colors,
    config,
    onConfigChange,
    themeParams,
    onDownload,
    onThemeChange,
    visibility,
    imageTransform,
    onImageTransformChange,
    onVisibilityChange,
  } = props;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      await exportCard(cardRef.current, {
        filename: defaultFilename(data.sport, data.date),
      });
      onDownload();
    } finally {
      setIsExporting(false);
    }
  };

  const showRepositionHint = photoUrl !== null && visibility.photoBackdrop;

  // Editor-specific photo extras: the "Use as background" switch + the reposition
  // hint. Every theme can show a photo now, so the switch appears whenever one is
  // loaded; turning it off falls back to the theme's designed (photo-free) look.
  const photoExtras = (
    <>
      {photoUrl ? (
        <div className="mt-3 flex items-center justify-between border border-foreground/15 border-dashed px-3 py-2.5">
          <Label
            className="font-medium text-sm"
            htmlFor="photo-backdrop-switch"
          >
            Use as background
          </Label>
          <Switch
            checked={visibility.photoBackdrop}
            id="photo-backdrop-switch"
            onCheckedChange={(checked) =>
              onVisibilityChange({ ...visibility, photoBackdrop: checked })
            }
          />
        </div>
      ) : null}
      {showRepositionHint ? (
        <p className="caption-micro mt-2">
          Tap “Adjust” on the preview to move &amp; zoom
        </p>
      ) : null}
    </>
  );

  const tools = useActivityTools({
    athleteName: props.athleteName,
    available: props.available,
    colorAdjustable: props.colorAdjustable,
    colorChoice: props.colorChoice,
    colorIsDefault: props.colorIsDefault,
    data,
    location: props.location,
    mode: "single",
    onAthleteNameChange: props.onAthleteNameChange,
    onColorChoiceChange: props.onColorChoiceChange,
    onFilesLoaded: props.onFilesLoaded,
    onLocationChange: props.onLocationChange,
    onOpenStravaPicker: props.onOpenStravaPicker,
    onPhotoChange: props.onPhotoChange,
    onPhotoEffectsChange: props.onPhotoEffectsChange,
    onSportChange: props.onSportChange,
    onThemeConfigChange: onConfigChange,
    onTitleChange: props.onTitleChange,
    onVisibilityChange,
    paramCtx: { data, palette: paramPalette },
    photoAllowRotate: false,
    photoEffects,
    photoExtras,
    photoUrl,
    themeConfig: config,
    themeControl: (
      <ThemeRail
        labels={SINGLE_CARD_THEMES}
        onThemeChange={onThemeChange}
        order={THEME_ORDER}
        theme={theme}
      />
    ),
    themeParams,
    title: props.title,
    visibility,
  });

  return (
    <TooltipProvider delay={200}>
      <ControlDeck
        action={{
          icon: (
            <DownloadSimpleIcon
              aria-hidden
              className="size-5"
              weight="duotone"
            />
          ),
          isBusy: isExporting,
          label: "Download PNG",
          meta: "1080 × 1350",
          onAction: handleDownload,
        }}
        preview={
          <SingleCardPreview
            colors={colors}
            config={config}
            data={data}
            imageTransform={imageTransform}
            onImageTransformChange={onImageTransformChange}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoEffects={photoEffects}
            photoUrl={photoUrl}
            theme={theme}
          />
        }
        tools={tools}
      >
        {/* Native-size mount used by html-to-image. Off-screen via translate
            (which html-to-image strips when capturing) but laid out at full
            1080×1350 so the flex columns reflow correctly inside the clone. */}
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 -z-10"
          ref={cardRef}
          style={{ width: 1080, height: 1350, transform: "translateX(-200%)" }}
        >
          <RenderTheme
            colors={colors}
            config={config}
            data={data}
            imageTransform={imageTransform}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoEffects={photoEffects}
            photoUrl={photoUrl}
            theme={theme}
          />
        </div>
      </ControlDeck>
    </TooltipProvider>
  );
}
