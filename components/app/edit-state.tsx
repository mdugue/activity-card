"use client";

import { ArrowRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import {
  ALTITUDE_MOODS,
  type AltitudeMood,
} from "@/components/themes/altitude";
import { THEME_META } from "@/components/themes/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { PaletteStatus } from "@/hooks/use-image-palette";
import { useStravaConnection } from "@/hooks/use-strava-connection";
import { defaultFilename, exportCard } from "@/lib/export-card";
import { formatDate } from "@/lib/format";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme, PhotoMood } from "@/lib/palette";
import { type ParsedActivity, parseActivityFile } from "@/lib/parse-activity";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/visibility";
import { RenderTheme, type ThemeId } from "./render-theme";
import type { ActivityData, Sport } from "./sample-data";
import { ThemeCarousel } from "./theme-carousel";

const ACTIVITY_FILE_RE = /\.(gpx|fit)$/i;

const ACCENTS = [
  "#c45a2c",
  "#1d3a2e",
  "#1e6fa0",
  "#d23f1d",
  "#11151a",
  "#a98352",
];

interface VisibilityToggleDef {
  capability: "usesHeartRate" | "usesSplits";
  key: keyof Visibility;
  label: string;
}

// Toggles for fields that have no inline input — athleteName and location
// each ride alongside their input via DetailField's `toggle` prop, so they
// don't belong here.
const VISIBILITY_TOGGLES: VisibilityToggleDef[] = [
  { key: "heartRate", label: "Heart rate", capability: "usesHeartRate" },
  { key: "splits", label: "Splits", capability: "usesSplits" },
];

// Ordered moods for the Altitude theme — keys map to ALTITUDE_MOODS specs.
// Labels are derived from each spec's `label` field for a single source of truth.
const ALTITUDE_MOOD_ORDER: AltitudeMood[] = [
  "day",
  "dawn",
  "night",
  "heat",
  "rain",
  "snow",
];

const PHOTO_MOODS: { id: PhotoMood; label: string; sub: string }[] = [
  { id: "vibrant", label: "VIBRANT", sub: "photo-forward" },
  { id: "muted", label: "MUTED", sub: "editorial calm" },
  { id: "complementary", label: "COMPLEMENT", sub: "designed contrast" },
  { id: "spectrum", label: "SPECTRUM", sub: "every swatch in play" },
  { id: "pure", label: "PURE", sub: "type only · ignores photo" },
];

const SPORT_OPTIONS: { value: Sport; label: string }[] = [
  { value: "ride", label: "Ride" },
  { value: "run", label: "Run" },
  { value: "swim", label: "Swim" },
  { value: "triathlon", label: "Triathlon" },
];

interface EditStateProps {
  accent: string;
  altitudeMood: AltitudeMood;
  athleteName: string;
  data: ActivityData;
  imageTransform: ImageTransform;
  location: string;
  onAccentChange: (accent: string) => void;
  onAltitudeMoodChange: (mood: AltitudeMood) => void;
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
  visibility: Visibility;
}

export function EditState(props: EditStateProps) {
  const {
    data,
    theme,
    photoUrl,
    photoPaletteTheme,
    altitudeMood,
    onDownload,
    onThemeChange,
    visibility,
    imageTransform,
    onImageTransformChange,
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

  return (
    <TooltipProvider delay={200}>
      <div className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 gap-8 px-6 pt-14 pb-8 md:px-10 lg:grid-cols-[minmax(0,640px)_400px] lg:gap-12 lg:px-10 lg:pt-16">
        <div className="min-w-0">
          <ThemeCarousel
            altitudeMood={altitudeMood}
            data={data}
            imageTransform={imageTransform}
            onImageTransformChange={onImageTransformChange}
            onThemeChange={onThemeChange}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoPaletteTheme={photoPaletteTheme}
            photoUrl={photoUrl}
            theme={theme}
          />
        </div>
        <ControlsPane
          {...props}
          isExporting={isExporting}
          onDownload={handleDownload}
        />
        {/* Native-size mount used by html-to-image. Off-screen via translate
            (which html-to-image strips when capturing) but laid out at full
            1080×1350 so the flex columns reflow correctly inside the clone. */}
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 -z-10"
          ref={cardRef}
          style={{
            width: 1080,
            height: 1350,
            transform: "translateX(-200%)",
          }}
        >
          <RenderTheme
            altitudeMood={altitudeMood}
            data={data}
            imageTransform={imageTransform}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoPaletteTheme={photoPaletteTheme}
            photoUrl={photoUrl}
            theme={theme}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

interface ControlsPaneProps extends EditStateProps {
  isExporting: boolean;
}

function ControlsPane({
  data,
  theme,
  onTitleChange,
  onSportChange,
  photoUrl,
  onPhotoChange,
  accent,
  onAccentChange,
  onDownload,
  onFilesLoaded,
  onOpenStravaPicker,
  visibility,
  onVisibilityChange,
  isExporting,
  athleteName,
  location,
  onAthleteNameChange,
  onLocationChange,
  altitudeMood,
  onAltitudeMoodChange,
  photoMood,
  onPhotoMoodChange,
  photoPaletteStatus,
}: ControlsPaneProps) {
  const titleId = useId();
  const athleteId = useId();
  const locationId = useId();
  const meta = THEME_META[theme];
  const photoSupported = meta.photoMode !== "none";
  const showBackdropSwitch = meta.photoMode === "supports";
  const showRepositionHint = meta.photoMode === "hero" && photoUrl !== null;
  const showAltitudeMood = theme === "altitude";
  const showPhotoMood = theme === "photo" && photoUrl !== null;

  return (
    <div className="flex flex-col gap-7 pr-2 lg:pr-10">
      <FileLoadedRow
        data={data}
        onFilesLoaded={onFilesLoaded}
        onOpenStravaPicker={onOpenStravaPicker}
      />
      <StravaConnectionRow data={data} />

      <ControlBlock label="TITLE">
        <Label className="sr-only" htmlFor={titleId}>
          Activity title
        </Label>
        <Input
          className="h-auto border-foreground border-b-2 py-2 font-heading text-2xl tracking-tight md:text-2xl"
          id={titleId}
          onChange={(e) => onTitleChange(e.target.value)}
          value={data.title}
        />
      </ControlBlock>

      <ControlBlock label="SPORT">
        <Select
          onValueChange={(v) => onSportChange(v as Sport)}
          value={data.sport}
        >
          <SelectTrigger aria-label="Sport" className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ControlBlock>

      <ControlBlock label="DETAILS">
        <div className="mt-2 flex flex-col gap-4">
          <DetailField
            disabled={!meta.usesAthleteName}
            disabledReason={`${meta.label} theme doesn't show athlete name`}
            hint="Saved on this device"
            id={athleteId}
            label="Athlete name"
            onChange={onAthleteNameChange}
            placeholder="Add your name"
            toggle={{
              checked: visibility.athleteName,
              onChange: (checked) =>
                onVisibilityChange({ ...visibility, athleteName: checked }),
            }}
            value={athleteName}
          />
          <DetailField
            disabled={!meta.usesLocation}
            disabledReason={`${meta.label} theme doesn't show location`}
            id={locationId}
            label="Location"
            onChange={onLocationChange}
            placeholder="Where was this?"
            toggle={{
              checked: visibility.location,
              onChange: (checked) =>
                onVisibilityChange({ ...visibility, location: checked }),
            }}
            value={location}
          />
        </div>
      </ControlBlock>

      <ControlBlock label="BACKGROUND PHOTO">
        <PhotoControl
          disabled={!photoSupported}
          onChange={onPhotoChange}
          photoUrl={photoUrl}
        />
        {photoSupported ? null : (
          <p className="caption-micro mt-2">
            {meta.label} theme has no room for a photo
          </p>
        )}
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
                onVisibilityChange({
                  ...visibility,
                  photoBackdrop: checked,
                })
              }
            />
          </div>
        ) : null}
      </ControlBlock>

      {showAltitudeMood ? (
        <ControlBlock label="MOOD">
          <ToggleGroup
            aria-label="Altitude mood"
            className="mt-2 grid w-full grid-cols-3 gap-2"
            onValueChange={(values) => {
              if (values[0]) {
                onAltitudeMoodChange(values[0] as AltitudeMood);
              }
            }}
            spacing={2}
            value={[altitudeMood]}
            variant="outline"
          >
            {ALTITUDE_MOOD_ORDER.map((id) => (
              <ToggleGroupItem
                aria-label={ALTITUDE_MOODS[id].label}
                className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
                key={id}
                value={id}
              >
                <div className="font-heading text-base uppercase leading-none">
                  {ALTITUDE_MOODS[id].label}
                </div>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ControlBlock>
      ) : null}

      {showPhotoMood ? (
        <ControlBlock label="MOOD">
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
        </ControlBlock>
      ) : null}

      <ControlBlock label="EXTRA METRICS">
        <div className="mt-3 flex flex-col gap-2.5">
          {VISIBILITY_TOGGLES.map((t) => {
            const supported = meta[t.capability];
            return (
              <ToggleRow
                checked={visibility[t.key]}
                disabled={!supported}
                disabledReason={`${meta.label} theme doesn't use ${t.label.toLowerCase()}`}
                key={t.key}
                label={t.label}
                onCheckedChange={(checked) =>
                  onVisibilityChange({ ...visibility, [t.key]: checked })
                }
              />
            );
          })}
        </div>
      </ControlBlock>

      <ControlBlock label="ACCENT">
        <ToggleGroup
          aria-label="Accent colour"
          className="mt-2.5 flex gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              onAccentChange(values[0]);
            }
          }}
          spacing={2}
          value={[accent]}
        >
          {ACCENTS.map((c) => (
            <ToggleGroupItem
              aria-label={`Accent ${c}`}
              className="size-8 border-2 border-transparent p-0 data-[state=on]:border-foreground"
              key={c}
              style={{ background: c }}
              value={c}
            />
          ))}
        </ToggleGroup>
      </ControlBlock>

      <Button
        className="mt-4 h-auto justify-between py-4 font-heading text-lg"
        disabled={isExporting}
        onClick={onDownload}
        size="lg"
      >
        <span>{isExporting ? "Rendering…" : "Download PNG"}</span>
        <span className="font-medium font-mono text-[10px] tracking-[0.18em] opacity-75">
          1080 × 1350
        </span>
      </Button>
    </div>
  );
}

function DetailField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
  disabledReason,
  toggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  disabledReason?: string;
  toggle?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
}) {
  const labelEl = (
    <Label
      className="font-medium font-mono text-[11px] uppercase tracking-[0.22em] opacity-65"
      htmlFor={id}
    >
      {label}
    </Label>
  );
  return (
    <div className={disabled ? "opacity-45" : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          {disabled && disabledReason ? (
            <Tooltip>
              <TooltipTrigger render={<span>{labelEl}</span>} />
              <TooltipContent>{disabledReason}</TooltipContent>
            </Tooltip>
          ) : (
            labelEl
          )}
          {hint ? (
            <span className="font-medium font-mono text-[9px] uppercase tracking-[0.18em] opacity-50">
              {hint}
            </span>
          ) : null}
        </div>
        {toggle ? (
          <Switch
            aria-label={`Show ${label.toLowerCase()} on card`}
            checked={toggle.checked}
            disabled={disabled}
            onCheckedChange={toggle.onChange}
          />
        ) : null}
      </div>
      <Input
        className="mt-1 h-auto border-0 border-foreground border-b-2 px-0 py-1.5 font-heading text-lg tracking-tight focus-visible:ring-0"
        disabled={disabled}
        id={id}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

function PhotoControl({
  photoUrl,
  onChange,
  disabled,
}: {
  photoUrl: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-3 border border-foreground/35 border-dashed p-3",
        disabled && "opacity-45"
      )}
    >
      <input
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onChange(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      <div
        aria-hidden
        className="size-12"
        style={{
          background: photoUrl
            ? `url(${photoUrl}) center/cover`
            : "linear-gradient(135deg, #d8c5a0, #4a2a18)",
        }}
      />
      <div className="flex-1 font-medium font-mono text-xs opacity-70">
        {photoUrl ? "Photo loaded" : "NO PHOTO · TAP TO ADD"}
      </div>
      {photoUrl ? (
        <Button
          disabled={disabled}
          onClick={() => onChange(null)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      ) : null}
      <Button
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        size="sm"
        variant={photoUrl ? "ghost" : "default"}
      >
        {photoUrl ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}

function StravaConnectionRow({ data }: { data: ActivityData }) {
  const strava = useStravaConnection();
  // Disconnect itself lives in the app-wide footer (single source of truth);
  // this row exists only when the loaded activity came from Strava and
  // needs the "View on Strava" link(s). Hide otherwise.
  if (!strava.connected || data.source !== "strava") {
    return null;
  }
  return (
    <div className="-mt-3 flex flex-col gap-1.5 border-foreground/10 border-b pb-3 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: "#FC5200" }}
        />
        <span>
          STRAVA
          {strava.athlete?.firstname ? ` · ${strava.athlete.firstname}` : ""}
          <span className="ml-1 opacity-70">· this activity</span>
        </span>
      </div>
      <ViewOnStravaLinks data={data} />
    </div>
  );
}

/**
 * Renders one or more "View on Strava" anchors per Strava brand guidelines
 * §3 (font-weight 700, underline, brand orange `#FC5200`). Single Strava
 * activity → one link. Combined triathlon with segment-aligned ids →
 * one link per Strava-sourced segment, labelled by sport. Mixed-source
 * triathlons render only the Strava-backed segments. Renders nothing if
 * `stravaActivityIds` is absent.
 */
function ViewOnStravaLinks({ data }: { data: ActivityData }) {
  const ids = data.stravaActivityIds;
  if (!ids?.length) {
    return null;
  }
  if (ids.length === 1 && ids[0] !== null) {
    return (
      <a
        className="font-bold text-[#FC5200] underline-offset-4 hover:underline"
        href={`https://www.strava.com/activities/${ids[0]}/overview`}
        rel="noopener noreferrer"
        target="_blank"
      >
        View on Strava ↗
      </a>
    );
  }
  // Triathlon — pair ids with segments by index so we can label per sport.
  // `null` slots are file-sourced segments; they're skipped silently.
  const segments = data.segments ?? [];
  const links = ids
    .map((id, i) => ({ id, sport: segments[i]?.sport }))
    .filter(
      (x): x is { id: number; sport: NonNullable<typeof x.sport> } =>
        x.id !== null && x.sport !== undefined
    );
  if (links.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>View on Strava:</span>
      {links.map(({ id, sport }, i) => (
        <span key={id}>
          <a
            className="font-bold text-[#FC5200] underline-offset-4 hover:underline"
            href={`https://www.strava.com/activities/${id}/overview`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {sport.toUpperCase()}
          </a>
          {i < links.length - 1 ? <span aria-hidden> ·</span> : null}
        </span>
      ))}
    </div>
  );
}

function FileLoadedRow({
  data,
  onFilesLoaded,
  onOpenStravaPicker,
}: {
  data: ActivityData;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onOpenStravaPicker: () => void;
}) {
  const fromStrava = data.source === "strava";
  const segCount = data.segments?.length ?? 0;
  const isMulti = data.sport === "triathlon" && segCount >= 2;
  const friendlyDate = formatDate(data.date);
  const slug = friendlyDate.replace(/\s|,/g, "").toLowerCase() || "activity";
  // Strava users never see a `.fit` filename, so don't pretend. For
  // uploads we keep the file-like label that mirrors what the user
  // dropped in.
  let label: string;
  if (fromStrava) {
    label = isMulti
      ? `Strava · ${segCount} activities combined`
      : `Strava · ${data.title || data.sport}`;
  } else if (isMulti) {
    label = `${segCount} files · assembled`;
  } else {
    label = `${data.sport}_${slug}.fit`;
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList).filter((f) =>
      ACTIVITY_FILE_RE.test(f.name)
    );
    if (!files.length) {
      setError("Drop a .gpx or .fit file.");
      return;
    }
    setError(null);
    setIsSwapping(true);
    try {
      const parts = await Promise.all(files.map((f) => parseActivityFile(f)));
      onFilesLoaded(parts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = () => {
    if (fromStrava) {
      onOpenStravaPicker();
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-medium font-mono text-[11px] opacity-60">
        <div aria-hidden className="size-1.5 rounded-full bg-primary" />
        <span className="truncate">{isSwapping ? "Reading…" : label}</span>
        <input
          accept=".gpx,.fit"
          className="hidden"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <button
          className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50"
          disabled={isSwapping}
          onClick={handleSwap}
          type="button"
        >
          Swap
          <ArrowRight aria-hidden className="size-2.5" />
        </button>
      </div>
      {error ? (
        <div className="font-mono text-[10px] text-destructive">{error}</div>
      ) : null}
    </div>
  );
}

function ControlBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="caption-label">{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
  disabledReason,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const id = useId();
  const labelEl = (
    <Label
      className={cn("font-medium text-sm", disabled && "opacity-50")}
      htmlFor={id}
    >
      {label}
    </Label>
  );
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        disabled && "opacity-60"
      )}
    >
      {disabled && disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span>{labelEl}</span>} />
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        labelEl
      )}
      <Switch
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
