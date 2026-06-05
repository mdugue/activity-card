"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { THEME_META, THEME_ORDER } from "@/components/themes/index";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { PaletteStatus } from "@/hooks/use-image-palette";
import type { AltitudeConfig } from "@/lib/altitude";
import { defaultFilename, exportCard } from "@/lib/export-card";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme, PhotoMood } from "@/lib/palette";
import type { ParsedActivity } from "@/lib/parse-activity";
import type { Visibility } from "@/lib/visibility";
import { useActivityTools } from "./activity-tools";
import { AltitudeControls } from "./altitude-controls";
import { ControlDeck } from "./control-deck";
import { RenderTheme, type ThemeId } from "./render-theme";
import type { ActivityData, Sport } from "./sample-data";
import { SingleCardPreview } from "./single-card-preview";
import { ThemeRail } from "./theme-rail";

const PHOTO_MOODS: { id: PhotoMood; label: string; sub: string }[] = [
  { id: "vibrant", label: "VIBRANT", sub: "photo-forward" },
  { id: "muted", label: "MUTED", sub: "editorial calm" },
  { id: "complementary", label: "COMPLEMENT", sub: "designed contrast" },
  { id: "spectrum", label: "SPECTRUM", sub: "every swatch in play" },
  { id: "pure", label: "PURE", sub: "type only · ignores photo" },
];

/** Single Card's default accent — the Reset target in every single-card theme. */
const DEFAULT_SINGLE_ACCENT = "#c45a2c";

interface EditStateProps {
  accent: string;
  altitudeConfig: AltitudeConfig;
  athleteName: string;
  available: Record<keyof Visibility, boolean>;
  data: ActivityData;
  imageTransform: ImageTransform;
  location: string;
  onAccentChange: (accent: string) => void;
  onAltitudeConfigChange: (config: AltitudeConfig) => void;
  onAthleteNameChange: (name: string) => void;
  onDownload: () => void;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onImageTransformChange: (next: ImageTransform) => void;
  onLocationChange: (location: string) => void;
  onOpenStravaPicker: () => void;
  onPhotoChange: (file: File | null) => void;
  onPhotoMoodChange: (mood: PhotoMood) => void;
  onSportChange: (sport: Sport) => void;
  onThemeChange: (theme: ThemeId) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  photoMood: PhotoMood;
  photoPaletteStatus: PaletteStatus;
  photoPaletteTheme: PaletteTheme | null;
  photoUrl: string | null;
  theme: ThemeId;
  title: string;
  visibility: Visibility;
}

export function EditState(props: EditStateProps) {
  const {
    data,
    theme,
    photoUrl,
    photoPaletteTheme,
    altitudeConfig,
    onDownload,
    onThemeChange,
    visibility,
    imageTransform,
    onImageTransformChange,
    onVisibilityChange,
    onAltitudeConfigChange,
    photoMood,
    onPhotoMoodChange,
    photoPaletteStatus,
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

  const meta = THEME_META[theme];
  const photoSupported = meta.photoMode !== "none";
  const showBackdropSwitch = meta.photoMode === "supports";
  const showRepositionHint = meta.photoMode === "hero" && photoUrl !== null;
  const showAltitudeMood = theme === "altitude";
  const showPhotoMood = theme === "photo" && photoUrl !== null;

  const photoExtras = (
    <>
      {showRepositionHint ? (
        <p className="caption-micro mt-2">
          Tap “Adjust” on the preview to move &amp; zoom
        </p>
      ) : null}
      {showBackdropSwitch && photoUrl ? (
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
    </>
  );

  let moodControl: React.ReactNode = null;
  if (showAltitudeMood) {
    moodControl = (
      <AltitudeControls
        config={altitudeConfig}
        data={data}
        onChange={onAltitudeConfigChange}
      />
    );
  } else if (showPhotoMood) {
    moodControl = (
      <>
        <ToggleGroup
          aria-label="Photo mood"
          className="mt-2 grid w-full grid-cols-3 gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              onPhotoMoodChange(values[0] as PhotoMood);
            }
          }}
          spacing={2}
          value={[photoMood]}
          variant="outline"
        >
          {PHOTO_MOODS.map((m) => (
            <ToggleGroupItem
              aria-label={m.label}
              className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
              key={m.id}
              value={m.id}
            >
              <div className="font-heading text-base uppercase leading-none">
                {m.label}
              </div>
              <div className="caption-micro mt-1">{m.sub}</div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {photoPaletteStatus === "loading" ? (
          <div className="caption-micro mt-2">READING COLOURS…</div>
        ) : null}
        {photoPaletteStatus === "error" ? (
          <div className="caption-micro mt-2">
            COULDN&apos;T READ COLOURS · PURE STILL WORKS
          </div>
        ) : null}
      </>
    );
  }

  const tools = useActivityTools({
    accent: props.accent,
    athleteName: props.athleteName,
    available: props.available,
    data,
    defaultAccent: DEFAULT_SINGLE_ACCENT,
    location: props.location,
    mode: "single",
    moodControl,
    onAccentChange: props.onAccentChange,
    onAthleteNameChange: props.onAthleteNameChange,
    onFilesLoaded: props.onFilesLoaded,
    onLocationChange: props.onLocationChange,
    onOpenStravaPicker: props.onOpenStravaPicker,
    onPhotoChange: props.onPhotoChange,
    onSportChange: props.onSportChange,
    onTitleChange: props.onTitleChange,
    onVisibilityChange,
    photoExtras,
    photoSupported,
    photoUrl,
    themeControl: (
      <ThemeRail
        labels={THEME_META}
        onThemeChange={onThemeChange}
        order={THEME_ORDER}
        theme={theme}
      />
    ),
    themeLabel: meta.label,
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
            altitudeConfig={altitudeConfig}
            data={data}
            imageTransform={imageTransform}
            onImageTransformChange={onImageTransformChange}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoPaletteTheme={photoPaletteTheme}
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
            altitudeConfig={altitudeConfig}
            data={data}
            imageTransform={imageTransform}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoPaletteTheme={photoPaletteTheme}
            photoUrl={photoUrl}
            theme={theme}
          />
        </div>
      </ControlDeck>
    </TooltipProvider>
  );
}
