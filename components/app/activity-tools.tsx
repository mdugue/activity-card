"use client";

// Builds the shared list of editor categories (the `ControlTool[]` the
// ControlDeck renders) from the activity + the active theme's parameter schema.
// The per-theme knobs are no longer special-cased: each theme declares `ParamDef`s
// (see `lib/params/`) and they render generically via `ThemeParamGroup`, filed
// into the category each param names (STYLE · LAYOUT · MARKS). Shared controls —
// the theme rail, accent, photo, text, stats, marks, activity — round out the
// groups. Both editors consume this hook; they differ only in the params they
// pass and a couple of mode flags (carousel marks, photo rotate).

import {
  ArrowCounterClockwiseIcon,
  ChartBarIcon,
  ImageIcon,
  LayoutIcon,
  MedalIcon,
  PaletteIcon,
  PersonSimpleBikeIcon,
  PersonSimpleRunIcon,
  PersonSimpleSwimIcon,
  StarIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { useId } from "react";
import type { ControlTool } from "@/components/app/control-deck";
import type { CardMode } from "@/components/app/mode-toggle";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ParamCtx, ParamDef } from "@/lib/params/kinds";
import type { ParsedActivity } from "@/lib/parse-activity";
import type { PhotoEffects } from "@/lib/photo-effects";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/visibility";
import { ActivitySource } from "./activity-source";
import {
  ControlBlock,
  DetailField,
  PhotoControl,
  RichSelect,
  type RichSelectOption,
  ToggleRow,
} from "./control-primitives";
import {
  PhotoFilterControl,
  PhotoTransformControls,
} from "./photo-effects-controls";
import type { ActivityData, Sport } from "./sample-data";
import { ThemeParamGroup, themeDeclaresGroup } from "./theme-params";

// Shared by the section headers and the rich sport picker below — duotone glyph
// at a calm, consistent size.
const ICON_PROPS = {
  "aria-hidden": true,
  className: "size-5",
  weight: "duotone",
} as const;

const SPORT_OPTIONS: RichSelectOption[] = [
  {
    value: "ride",
    primary: "Ride",
    hint: "Cycling",
    icon: <PersonSimpleBikeIcon {...ICON_PROPS} />,
  },
  {
    value: "run",
    primary: "Run",
    hint: "Running",
    icon: <PersonSimpleRunIcon {...ICON_PROPS} />,
  },
  {
    value: "swim",
    primary: "Swim",
    hint: "Swimming",
    icon: <PersonSimpleSwimIcon {...ICON_PROPS} />,
  },
  {
    value: "triathlon",
    primary: "Triathlon",
    hint: "Multi-sport",
    icon: <MedalIcon {...ICON_PROPS} />,
  },
];

// Includes each carousel theme's signature accent so a Reset always lands on a
// highlighted swatch.
export const ACCENTS = [
  "#c45a2c",
  "#e0683a",
  "#ff7a3c",
  "#2f6f86",
  "#1e6fa0",
  "#1d3a2e",
  "#b1281a",
  "#a98352",
  "#1a1714",
  "#e8c39e",
];

interface ToggleDef {
  key: keyof Visibility;
  label: string;
}

// Distance and time are the card's irreducible core — never hideable on a
// single card (the carousel can drop them).
const CORE_METRICS: ReadonlySet<keyof Visibility> = new Set([
  "distance",
  "time",
]);

const STAT_TOGGLES: ToggleDef[] = [
  { key: "distance", label: "Distance" },
  { key: "time", label: "Time" },
  { key: "pace", label: "Pace" },
  { key: "speed", label: "Speed" },
  { key: "power", label: "Power (watts)" },
  { key: "elevation", label: "Elevation gain" },
  { key: "heartRate", label: "Heart rate" },
  { key: "cadence", label: "Cadence" },
  { key: "splits", label: "Splits" },
];

const VIZ_TOGGLES: ToggleDef[] = [
  { key: "route", label: "Route / path" },
  { key: "elevationViz", label: "Elevation profile" },
];

const CAROUSEL_TOGGLES: ToggleDef[] = [
  { key: "showEffort", label: "“Made with Effort” mark" },
  { key: "showPageNumber", label: "Page numbers" },
];

interface UseActivityToolsProps {
  accent: string;
  athleteName: string;
  /** which switches address data the current activity actually has */
  available: Record<keyof Visibility, boolean>;
  data: ActivityData;
  /** the current theme's default accent (target of the Reset control) */
  defaultAccent: string;
  location: string;
  mode: CardMode;
  onAccentChange: (accent: string) => void;
  onAthleteNameChange: (name: string) => void;
  /** swap by uploading a new file (ACTIVITY section) */
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onLocationChange: (location: string) => void;
  /** swap by reopening the Strava picker (ACTIVITY section) */
  onOpenStravaPicker: () => void;
  onPhotoChange: (file: File | null) => void;
  onPhotoEffectsChange: (next: PhotoEffects) => void;
  onSportChange: (sport: Sport) => void;
  onThemeConfigChange: (next: Record<string, unknown>) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  /** the active theme's parameter context (data + extracted palette) */
  paramCtx: ParamCtx;
  /** rotate is geometry-correct on the carousel panorama; off on the single card */
  photoAllowRotate: boolean;
  photoEffects: PhotoEffects;
  /** editor-specific photo extras (backdrop switch / reposition hint) */
  photoExtras?: React.ReactNode;
  photoUrl: string | null;
  /** the active theme's coerced config */
  themeConfig: Record<string, unknown>;
  /** the theme rail for this mode (rendered at the top of the STYLE section) */
  themeControl: React.ReactNode;
  /** the active theme's parameter schema */
  themeParams: ParamDef[];
  /** raw (unstripped) title for the editable input */
  title: string;
  visibility: Visibility;
}

export function useActivityTools(props: UseActivityToolsProps): ControlTool[] {
  const {
    data,
    mode,
    themeControl,
    themeParams,
    themeConfig,
    onThemeConfigChange,
    paramCtx,
    athleteName,
    location,
    visibility,
    available,
    accent,
    defaultAccent,
    photoUrl,
    photoEffects,
    photoAllowRotate,
    onTitleChange,
    onSportChange,
    onAthleteNameChange,
    onLocationChange,
    onVisibilityChange,
    onAccentChange,
    onPhotoChange,
    onPhotoEffectsChange,
    onFilesLoaded,
    onOpenStravaPicker,
    photoExtras,
    title,
  } = props;
  const titleId = useId();
  const athleteId = useId();
  const locationId = useId();

  const set = (key: keyof Visibility, checked: boolean) =>
    onVisibilityChange({ ...visibility, [key]: checked });

  const renderToggle = ({ key, label }: ToggleDef) => {
    const avail = available[key];
    const lockedCore = CORE_METRICS.has(key) && mode === "single";
    const disabled = !avail || lockedCore;
    let reason: string | undefined;
    let checked = visibility[key];
    if (!avail) {
      reason = "Not recorded in this activity";
      checked = false;
    } else if (lockedCore) {
      reason = "Always shown on the single card";
      checked = true;
    }
    return (
      <ToggleRow
        checked={checked}
        disabled={disabled}
        disabledReason={reason}
        key={key}
        label={label}
        onCheckedChange={(c) => set(key, c)}
      />
    );
  };

  const paramGroup = (
    group: Parameters<typeof ThemeParamGroup>[0]["group"]
  ) => (
    <ThemeParamGroup
      config={themeConfig}
      ctx={paramCtx}
      group={group}
      onChange={onThemeConfigChange}
      params={themeParams}
    />
  );

  const tools: ControlTool[] = [];

  // STYLE leads: the theme rail, the accent swatches, then any STYLE params the
  // theme exposes (atmosphere / colour). The "what does this card look like"
  // choices live together.
  tools.push({
    id: "style",
    label: "STYLE",
    icon: <PaletteIcon {...ICON_PROPS} />,
    content: (
      <div className="flex flex-col gap-5">
        <ControlBlock label="THEME">
          {themeControl}
          <div className="caption-micro mt-4 mb-2">ACCENT</div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              aria-label="Accent colour"
              className="flex flex-wrap gap-2"
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
                  className={cn(
                    "size-8 rounded-full border-2 border-transparent p-0 outline-none transition-transform",
                    "ring-foreground ring-offset-2 ring-offset-background",
                    "data-pressed:ring-2"
                  )}
                  key={c}
                  style={{ background: c }}
                  value={c}
                />
              ))}
            </ToggleGroup>
            <Button
              className="ml-auto"
              disabled={accent === defaultAccent}
              onClick={() => onAccentChange(defaultAccent)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ArrowCounterClockwiseIcon weight="duotone" />
              Reset
            </Button>
          </div>
        </ControlBlock>
        {paramGroup("style")}
      </div>
    ),
  });

  // The photo is a prominent control — every theme can show one, adjustable via
  // the same filter / grain / transform presets as the carousel.
  tools.push({
    id: "photo",
    label: "PHOTO",
    icon: <ImageIcon {...ICON_PROPS} />,
    content: (
      <ControlBlock label="BACKGROUND PHOTO">
        <PhotoControl onChange={onPhotoChange} photoUrl={photoUrl} prominent />
        {photoExtras}
        {photoUrl ? (
          <>
            <div className="mt-3">
              <div className="caption-micro mb-1.5">FILTER</div>
              <PhotoFilterControl
                effects={photoEffects}
                onChange={onPhotoEffectsChange}
              />
            </div>
            <PhotoTransformControls
              allowRotate={photoAllowRotate}
              effects={photoEffects}
              onChange={onPhotoEffectsChange}
            />
          </>
        ) : null}
      </ControlBlock>
    ),
  });

  // LAYOUT — composition & type knobs the theme exposes (headline / font /
  // position / treatment / density). Only present when the theme has any.
  if (themeDeclaresGroup(themeParams, "layout")) {
    tools.push({
      id: "layout",
      label: "LAYOUT",
      icon: <LayoutIcon {...ICON_PROPS} />,
      content: (
        <ControlBlock label="LAYOUT">{paramGroup("layout")}</ControlBlock>
      ),
    });
  }

  // Text overlays — all styled the same, none more prominent than another.
  tools.push({
    id: "text",
    label: "TEXT",
    icon: <TextAaIcon {...ICON_PROPS} />,
    content: (
      <ControlBlock label="TEXT">
        <div className="mt-2 flex flex-col gap-4">
          <DetailField
            id={titleId}
            label="Title"
            onChange={onTitleChange}
            placeholder="Name this effort"
            toggle={{
              checked: visibility.title,
              onChange: (c) => set("title", c),
            }}
            value={title}
          />
          <DetailField
            id={locationId}
            label="Location"
            onChange={onLocationChange}
            placeholder="Where was this?"
            toggle={{
              checked: visibility.location,
              onChange: (c) => set("location", c),
            }}
            value={location}
          />
          <ToggleRow
            checked={available.date && visibility.date}
            disabled={!available.date}
            disabledReason="No date on this activity"
            label="Date"
            onCheckedChange={(c) => set("date", c)}
          />
        </div>
      </ControlBlock>
    ),
  });

  tools.push({
    id: "stats",
    label: "STATS",
    icon: <ChartBarIcon {...ICON_PROPS} />,
    content: (
      <div className="flex flex-col gap-5">
        <ControlBlock label="STATS">
          <div className="mt-2 flex flex-col gap-2.5">
            {STAT_TOGGLES.map(renderToggle)}
          </div>
        </ControlBlock>
        <ControlBlock label="VISUALISATIONS">
          <div className="mt-2 flex flex-col gap-2.5">
            {VIZ_TOGGLES.map(renderToggle)}
          </div>
        </ControlBlock>
      </div>
    ),
  });

  // MARKS — annotations: carousel chrome (effort mark, page numbers) plus any
  // MARKS params the theme exposes (e.g. STRATA's peak/direction legend).
  const hasMarkParams = themeDeclaresGroup(themeParams, "marks");
  if (mode === "carousel" || hasMarkParams) {
    tools.push({
      id: "marks",
      label: "MARKS",
      icon: <StarIcon {...ICON_PROPS} />,
      content: (
        <div className="flex flex-col gap-5">
          {mode === "carousel" ? (
            <ControlBlock label="CAROUSEL MARKS">
              <div className="mt-2 flex flex-col gap-2.5">
                {CAROUSEL_TOGGLES.map(renderToggle)}
              </div>
            </ControlBlock>
          ) : null}
          {hasMarkParams ? (
            <ControlBlock label="MARKERS">
              <div className="mt-2">{paramGroup("marks")}</div>
            </ControlBlock>
          ) : null}
        </div>
      ),
    });
  }

  // Activity — the loaded source (Strava / file), View on Strava, Swap and
  // Disconnect, plus the sport + athlete metadata. Sits last.
  tools.push({
    id: "activity",
    label: "ACTIVITY",
    icon: <PersonSimpleRunIcon {...ICON_PROPS} />,
    content: (
      <ControlBlock label="ACTIVITY">
        <ActivitySource
          data={data}
          onFilesLoaded={onFilesLoaded}
          onOpenStravaPicker={onOpenStravaPicker}
        />
        <div className="mt-4 flex flex-col gap-4">
          <RichSelect
            ariaLabel="Sport"
            onValueChange={(v) => onSportChange(v as Sport)}
            options={SPORT_OPTIONS}
            value={data.sport}
          />
          <DetailField
            hint="Saved on this device"
            id={athleteId}
            label="Athlete name"
            onChange={onAthleteNameChange}
            placeholder="Add your name"
            toggle={{
              checked: visibility.athleteName,
              onChange: (c) => set("athleteName", c),
            }}
            value={athleteName}
          />
        </div>
      </ControlBlock>
    ),
  });

  return tools;
}
