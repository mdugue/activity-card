"use client";

import { ArrowRight } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CardPreview } from "./card-preview";
import type { ActivityData } from "./sample-data";

type Theme = "path" | "altitude" | "photo" | "data" | "editorial" | "triathlon";

const THEMES: { id: Theme; label: string; sub: string }[] = [
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

type EditStateProps = {
  data: ActivityData;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  photoUrl: string | null;
  accent: string;
  onAccentChange: (accent: string) => void;
  onDownload: () => void;
};

export function EditState({
  data,
  theme,
  onThemeChange,
  photoUrl,
  accent,
  onAccentChange,
  onDownload,
}: EditStateProps) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-8 px-6 pt-20 pb-8 md:px-10 lg:grid-cols-[1fr_400px] lg:gap-0 lg:px-0 lg:pt-24">
      <PreviewPane data={data} photoUrl={photoUrl} theme={theme} />
      <ControlsPane
        accent={accent}
        data={data}
        onAccentChange={onAccentChange}
        onDownload={onDownload}
        onThemeChange={onThemeChange}
        photoUrl={photoUrl}
        theme={theme}
      />
    </div>
  );
}

function PreviewPane({
  data,
  theme,
  photoUrl,
}: {
  data: ActivityData;
  theme: Theme;
  photoUrl: string | null;
}) {
  return (
    <div className="relative flex flex-col items-center justify-start lg:px-10">
      <div
        className="mb-4 self-start font-mono text-xs tracking-[0.28em] opacity-55 lg:ml-14"
        style={{ fontWeight: 500 }}
      >
        LIVE PREVIEW · 1080 × 1350
      </div>
      <div className="relative aspect-[1080/1350] w-[280px] overflow-hidden bg-white shadow-[0_30px_60px_rgba(26,23,20,0.18),_0_8px_20px_rgba(26,23,20,0.08)] sm:w-[380px] lg:w-[540px]">
        <ScaledCard data={data} photoUrl={photoUrl} theme={theme} />
      </div>
    </div>
  );
}

function ScaledCard({
  data,
  theme,
  photoUrl,
}: {
  data: ActivityData;
  theme: Theme;
  photoUrl: string | null;
}) {
  return (
    <div className="absolute inset-0">
      <div
        className="origin-top-left scale-[0.26] sm:scale-[0.352] lg:scale-[0.5]"
        style={{ width: 1080, height: 1350 }}
      >
        <CardPreview data={data} photoUrl={photoUrl} theme={theme} />
      </div>
    </div>
  );
}

function ControlsPane({
  data,
  theme,
  onThemeChange,
  photoUrl,
  accent,
  onAccentChange,
  onDownload,
}: EditStateProps) {
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
          style={{ fontFamily: "var(--font-heading)" }}
        />
      </ControlBlock>

      <ControlBlock label="THEME">
        <div className="mt-2 grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const isActive = t.id === theme;
            return (
              <button
                aria-pressed={isActive}
                className={
                  isActive
                    ? "border-2 border-foreground bg-foreground p-3 text-left text-background"
                    : "border-2 border-foreground/15 p-3 text-left transition-colors hover:border-foreground/40"
                }
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                type="button"
              >
                <div
                  className="font-heading text-xl uppercase leading-none"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t.label}
                </div>
                <div
                  className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] opacity-65"
                  style={{ fontWeight: 500 }}
                >
                  {t.sub}
                </div>
              </button>
            );
          })}
        </div>
      </ControlBlock>

      <ControlBlock label="BACKGROUND PHOTO">
        <div className="mt-2 flex items-center gap-3 border border-foreground/35 border-dashed p-3">
          <div
            aria-hidden
            className="size-12"
            style={{
              background: photoUrl
                ? `url(${photoUrl}) center/cover`
                : "linear-gradient(135deg, #d8c5a0, #4a2a18)",
            }}
          />
          <div
            className="flex-1 font-mono text-xs opacity-70"
            style={{ fontWeight: 500 }}
          >
            {photoUrl ? "sunset_kicker.jpg" : "NO PHOTO · DROP ONE IN"}
          </div>
          <Button size="sm" variant="ghost">
            {photoUrl ? "Replace" : "Upload"}
          </Button>
        </div>
      </ControlBlock>

      <ControlBlock label="SHOW ON CARD">
        <div className="mt-3 flex flex-col gap-2.5">
          <ToggleRow defaultChecked label="Athlete name" />
          <ToggleRow defaultChecked label="Location" />
          <ToggleRow label="Heart rate" />
          <ToggleRow defaultChecked label="Splits" />
        </div>
      </ControlBlock>

      <ControlBlock label="ACCENT">
        <div className="mt-2.5 flex gap-2">
          {ACCENTS.map((c) => (
            <button
              aria-label={`Accent ${c}`}
              aria-pressed={c === accent}
              className="size-8"
              key={c}
              onClick={() => onAccentChange(c)}
              style={{
                background: c,
                outline: c === accent ? "2px solid var(--foreground)" : "none",
                outlineOffset: 3,
              }}
              type="button"
            />
          ))}
        </div>
      </ControlBlock>

      <Button
        className="mt-4 h-auto justify-between bg-primary py-4 font-heading text-lg text-primary-foreground hover:bg-primary/90"
        onClick={onDownload}
        size="lg"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        <span>Download PNG</span>
        <span
          className="font-mono text-[10px] tracking-[0.18em] opacity-75"
          style={{ fontWeight: 500 }}
        >
          1080 × 1350
        </span>
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
        <div
          className="font-mono text-[10px] tracking-[0.22em] opacity-60"
          style={{ fontWeight: 500 }}
        >
          FILE LOADED
        </div>
        <div className="mt-1 font-mono text-sm" style={{ fontWeight: 500 }}>
          {filename}
        </div>
      </div>
      <button
        className="flex items-center gap-1 font-mono text-[11px] tracking-[0.18em] opacity-70 hover:opacity-100"
        style={{ fontWeight: 500 }}
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
      <div
        className="font-mono text-[11px] tracking-[0.28em] opacity-60"
        style={{ fontWeight: 600 }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between">
      <Label className="font-medium text-sm" htmlFor={id}>
        {label}
      </Label>
      <Switch defaultChecked={defaultChecked} id={id} />
    </div>
  );
}
