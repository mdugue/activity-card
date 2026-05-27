"use client";

import { ArrowRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { defaultFilename, exportCard } from "@/lib/export-card";
import type { Visibility } from "@/lib/visibility";
import { RenderTheme, type ThemeId } from "./render-theme";
import type { ActivityData } from "./sample-data";

const THEMES: { id: ThemeId; label: string; sub: string }[] = [
  { id: "path", label: "PATH", sub: "route is the hero" },
  { id: "altitude", label: "ALTITUDE", sub: "profile portrait" },
  { id: "photo", label: "PHOTO", sub: "magazine cover" },
  { id: "data", label: "DATA", sub: "dashboard poster" },
  { id: "editorial", label: "EDITORIAL", sub: "typography led" },
  { id: "triathlon", label: "TRIATHLON", sub: "multi-sport" },
];

const ACCENTS = [
  "#c45a2c",
  "#1d3a2e",
  "#1e6fa0",
  "#d23f1d",
  "#11151a",
  "#a98352",
];

const VISIBILITY_TOGGLES: { key: keyof Visibility; label: string }[] = [
  { key: "athleteName", label: "Athlete name" },
  { key: "location", label: "Location" },
  { key: "heartRate", label: "Heart rate" },
  { key: "splits", label: "Splits" },
];

interface EditStateProps {
  accent: string;
  data: ActivityData;
  onAccentChange: (accent: string) => void;
  onDownload: () => void;
  onPhotoChange: (file: File | null) => void;
  onThemeChange: (theme: ThemeId) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  photoUrl: string | null;
  theme: ThemeId;
  visibility: Visibility;
}

export function EditState(props: EditStateProps) {
  const { data, theme, photoUrl, onDownload } = props;
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
    <div className="grid flex-1 grid-cols-1 gap-8 px-6 pt-20 pb-8 md:px-10 lg:grid-cols-[1fr_400px] lg:gap-0 lg:px-0 lg:pt-24">
      <PreviewPane data={data} photoUrl={photoUrl} theme={theme} />
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
        <RenderTheme data={data} photoUrl={photoUrl} theme={theme} />
      </div>
    </div>
  );
}

function PreviewPane({
  data,
  theme,
  photoUrl,
}: {
  data: ActivityData;
  theme: ThemeId;
  photoUrl: string | null;
}) {
  return (
    <div className="relative flex flex-col items-center justify-start lg:px-10">
      <div className="mb-4 self-start font-medium font-mono text-xs tracking-[0.28em] opacity-55 lg:ml-14">
        LIVE PREVIEW · 1080 × 1350
      </div>
      <div className="relative aspect-[1080/1350] w-[280px] overflow-hidden bg-white shadow-[0_30px_60px_rgba(26,23,20,0.18),_0_8px_20px_rgba(26,23,20,0.08)] sm:w-[380px] lg:w-[540px]">
        <div className="absolute inset-0">
          <div
            className="origin-top-left scale-[0.26] sm:scale-[0.352] lg:scale-[0.5]"
            style={{ width: 1080, height: 1350 }}
          >
            <RenderTheme data={data} photoUrl={photoUrl} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ControlsPaneProps extends EditStateProps {
  isExporting: boolean;
}

function ControlsPane({
  data,
  theme,
  onThemeChange,
  photoUrl,
  onPhotoChange,
  accent,
  onAccentChange,
  onDownload,
  visibility,
  onVisibilityChange,
  isExporting,
}: ControlsPaneProps) {
  const titleId = useId();
  return (
    <div className="flex flex-col gap-7 pr-2 lg:pr-10">
      <FileLoadedRow data={data} />

      <ControlBlock label="TITLE">
        <Label className="sr-only" htmlFor={titleId}>
          Activity title
        </Label>
        <Input
          className="h-auto border-foreground border-b-2 py-2 font-heading text-2xl uppercase tracking-tight md:text-2xl"
          defaultValue={data.ride_name}
          id={titleId}
        />
      </ControlBlock>

      <ControlBlock label="THEME">
        <ToggleGroup
          aria-label="Theme"
          className="mt-2 grid w-full grid-cols-2 gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              onThemeChange(values[0] as ThemeId);
            }
          }}
          spacing={2}
          value={[theme]}
          variant="outline"
        >
          {THEMES.map((t) => (
            <ToggleGroupItem
              aria-label={t.label}
              className="flex h-auto flex-col items-start justify-start px-3 py-3 text-left"
              key={t.id}
              value={t.id}
            >
              <div className="font-heading text-xl uppercase leading-none">
                {t.label}
              </div>
              <div className="mt-1.5 font-medium font-mono text-[10px] uppercase tracking-[0.16em] opacity-65">
                {t.sub}
              </div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ControlBlock>

      <ControlBlock label="BACKGROUND PHOTO">
        <PhotoControl onChange={onPhotoChange} photoUrl={photoUrl} />
      </ControlBlock>

      <ControlBlock label="SHOW ON CARD">
        <div className="mt-3 flex flex-col gap-2.5">
          {VISIBILITY_TOGGLES.map((t) => (
            <ToggleRow
              checked={visibility[t.key]}
              key={t.key}
              label={t.label}
              onCheckedChange={(checked) =>
                onVisibilityChange({ ...visibility, [t.key]: checked })
              }
            />
          ))}
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

function PhotoControl({
  photoUrl,
  onChange,
}: {
  photoUrl: string | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-2 flex items-center gap-3 border border-foreground/35 border-dashed p-3">
      <input
        accept="image/*"
        className="hidden"
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
        <Button onClick={() => onChange(null)} size="sm" variant="ghost">
          Remove
        </Button>
      ) : null}
      <Button
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
  const filename = `${data.sport}_${data.date.replace(/\s|,/g, "").toLowerCase()}.fit`;
  return (
    <div className="flex items-center gap-3 bg-foreground p-4 text-background">
      <div aria-hidden className="size-2 bg-primary" />
      <div className="flex-1">
        <div className="font-medium font-mono text-[10px] tracking-[0.22em] opacity-60">
          FILE LOADED
        </div>
        <div className="mt-1 font-medium font-mono text-sm">{filename}</div>
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
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between">
      <Label className="font-medium text-sm" htmlFor={id}>
        {label}
      </Label>
      <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
    </div>
  );
}
