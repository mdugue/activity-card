"use client";

import { ArrowRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import { THEME_META } from "@/components/themes/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { defaultFilename, exportCard } from "@/lib/export-card";
import type { Visibility } from "@/lib/visibility";
import { RenderTheme, type ThemeId } from "./render-theme";
import type { ActivityData } from "./sample-data";
import { ThemeCarousel } from "./theme-carousel";

const ACCENTS = [
  "#c45a2c",
  "#1d3a2e",
  "#1e6fa0",
  "#d23f1d",
  "#11151a",
  "#a98352",
];

interface VisibilityToggleDef {
  capability:
    | "usesHeartRate"
    | "usesSplits"
    | "usesAthleteName"
    | "usesLocation";
  key: keyof Visibility;
  label: string;
}

const VISIBILITY_TOGGLES: VisibilityToggleDef[] = [
  { key: "athleteName", label: "Athlete name", capability: "usesAthleteName" },
  { key: "location", label: "Location", capability: "usesLocation" },
  { key: "heartRate", label: "Heart rate", capability: "usesHeartRate" },
  { key: "splits", label: "Splits", capability: "usesSplits" },
];

interface EditStateProps {
  accent: string;
  athleteName: string;
  data: ActivityData;
  location: string;
  onAccentChange: (accent: string) => void;
  onAthleteNameChange: (name: string) => void;
  onDownload: () => void;
  onLocationChange: (location: string) => void;
  onPhotoChange: (file: File | null) => void;
  onThemeChange: (theme: ThemeId) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  photoUrl: string | null;
  theme: ThemeId;
  visibility: Visibility;
}

export function EditState(props: EditStateProps) {
  const { data, theme, photoUrl, onDownload, onThemeChange, visibility } =
    props;
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
      <div className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 gap-8 px-6 pt-20 pb-8 md:px-10 lg:grid-cols-[minmax(0,640px)_400px] lg:gap-12 lg:px-10 lg:pt-24">
        <div className="min-w-0">
          <ThemeCarousel
            data={data}
            onThemeChange={onThemeChange}
            photoBackdropEnabled={visibility.photoBackdrop}
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
            data={data}
            photoBackdropEnabled={visibility.photoBackdrop}
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
  photoUrl,
  onPhotoChange,
  accent,
  onAccentChange,
  onDownload,
  visibility,
  onVisibilityChange,
  isExporting,
  athleteName,
  location,
  onAthleteNameChange,
  onLocationChange,
}: ControlsPaneProps) {
  const titleId = useId();
  const athleteId = useId();
  const locationId = useId();
  const meta = THEME_META[theme];
  const photoSupported = meta.photoMode !== "none";
  const showBackdropSwitch = meta.photoMode === "supports";

  return (
    <div className="flex flex-col gap-7 pr-2 lg:pr-10">
      <FileLoadedRow data={data} />

      <ControlBlock label="TITLE">
        <Label className="sr-only" htmlFor={titleId}>
          Activity title
        </Label>
        <Input
          className="h-auto border-foreground border-b-2 py-2 font-heading text-2xl uppercase tracking-tight md:text-2xl"
          id={titleId}
          onChange={(e) => onTitleChange(e.target.value)}
          value={data.ride_name}
        />
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
            value={athleteName}
          />
          <DetailField
            disabled={!meta.usesLocation}
            disabledReason={`${meta.label} theme doesn't show location`}
            id={locationId}
            label="Location"
            onChange={onLocationChange}
            placeholder="Where was this?"
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
        {!photoSupported && (
          <p className="mt-2 font-medium font-mono text-[10px] uppercase tracking-[0.18em] opacity-55">
            {meta.label} theme has no room for a photo
          </p>
        )}
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

      <ControlBlock label="SHOW ON CARD">
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
        className="mt-4 h-auto justify-between bg-primary py-4 font-heading text-lg text-primary-foreground hover:bg-primary/90"
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  disabledReason?: string;
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
      <div className="flex items-center justify-between">
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
      <Input
        className="mt-1 h-auto border-0 border-foreground border-b-2 px-0 py-1.5 font-heading text-lg uppercase tracking-tight focus-visible:ring-0"
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
      className={`mt-2 flex items-center gap-3 border border-foreground/35 border-dashed p-3 ${
        disabled ? "opacity-45" : ""
      }`}
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

function FileLoadedRow({ data }: { data: ActivityData }) {
  const segCount = data.segments?.length ?? 0;
  const isMulti = data.sport === "triathlon" && segCount >= 2;
  const label = isMulti
    ? `${segCount} files · assembled`
    : `${data.sport}_${data.date.replace(/\s|,/g, "").toLowerCase()}.fit`;
  return (
    <div className="flex items-center gap-3 bg-foreground p-4 text-background">
      <div aria-hidden className="size-2 bg-primary" />
      <div className="flex-1">
        <div className="font-medium font-mono text-[10px] tracking-[0.22em] opacity-60">
          {isMulti ? "MULTI-SPORT LOADED" : "FILE LOADED"}
        </div>
        <div className="mt-1 font-medium font-mono text-sm">{label}</div>
      </div>
      <button
        className="flex items-center gap-1 font-medium font-mono text-[11px] tracking-[0.18em] opacity-70 hover:opacity-100"
        type="button"
      >
        SWAP
        <ArrowRight aria-hidden className="size-3" />
      </button>
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
      <div className="font-mono font-semibold text-[11px] tracking-[0.28em] opacity-60">
        {label}
      </div>
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
      className={`font-medium text-sm ${disabled ? "opacity-50" : ""}`}
      htmlFor={id}
    >
      {label}
    </Label>
  );
  return (
    <div
      className={`flex items-center justify-between ${
        disabled ? "opacity-60" : ""
      }`}
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
