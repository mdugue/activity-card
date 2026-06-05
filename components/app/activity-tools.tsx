"use client";

// Builds the shared list of editor categories (the `ControlTool[]` the
// ControlDeck renders) from the activity + handlers. Every overlay element has a
// switch here, grouped by category; a switch is disabled when the activity has
// no data for it (`available`), and distance/time are locked on for the Single
// Card (its irreducible core). Both editors consume this hook, so the Single
// Card and Carousel control sets stay literally the same building blocks — they
// differ only in the mode-specific slots they pass in (theme picker, photo
// filter/effects, mood, marks).

import {
  ArrowCounterClockwiseIcon,
  ChartBarIcon,
  ImageIcon,
  PersonSimpleRunIcon,
  SquaresFourIcon,
  StarIcon,
  SunHorizonIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { useId } from "react";
import type { ControlTool } from "@/components/app/control-deck";
import type { CardMode } from "@/components/app/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ParsedActivity } from "@/lib/parse-activity";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/visibility";
import { ActivitySource } from "./activity-source";
import {
  ControlBlock,
  DetailField,
  PhotoControl,
  ToggleRow,
} from "./control-primitives";
import type { ActivityData, Sport } from "./sample-data";

const SPORT_OPTIONS: { value: Sport; label: string }[] = [
  { value: "ride", label: "Ride" },
  { value: "run", label: "Run" },
  { value: "swim", label: "Swim" },
  { value: "triathlon", label: "Triathlon" },
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
  /** photo filter (carousel); rendered in the PHOTO section, omit to drop it */
  filterControl?: React.ReactNode;
  location: string;
  mode: CardMode;
  /** MOOD category body (single-card altitude/photo mood); omit to drop it */
  moodControl?: React.ReactNode;
  onAccentChange: (accent: string) => void;
  onAthleteNameChange: (name: string) => void;
  /** swap by uploading a new file (ACTIVITY section) */
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onLocationChange: (location: string) => void;
  /** swap by reopening the Strava picker (ACTIVITY section) */
  onOpenStravaPicker: () => void;
  onPhotoChange: (file: File | null) => void;
  onSportChange: (sport: Sport) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  /** rendered inside the photo block (effects / reposition hint) */
  photoExtras?: React.ReactNode;
  photoSupported: boolean;
  photoUrl: string | null;
  /** the theme rail for this mode (rendered at the top of the THEME section) */
  themeControl: React.ReactNode;
  /** label used in "<theme> has no room for a photo" copy */
  themeLabel: string;
  /** raw (unstripped) title for the editable input */
  title: string;
  visibility: Visibility;
}

const ICON_PROPS = {
  "aria-hidden": true,
  className: "size-5",
  weight: "duotone",
} as const;

export function useActivityTools(props: UseActivityToolsProps): ControlTool[] {
  const {
    data,
    mode,
    themeLabel,
    themeControl,
    athleteName,
    location,
    visibility,
    available,
    accent,
    defaultAccent,
    photoUrl,
    photoSupported,
    onTitleChange,
    onSportChange,
    onAthleteNameChange,
    onLocationChange,
    onVisibilityChange,
    onAccentChange,
    onPhotoChange,
    onFilesLoaded,
    onOpenStravaPicker,
    photoExtras,
    filterControl,
    moodControl,
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

  const tools: ControlTool[] = [];

  // THEME leads: the scrolling theme rail, then the accent swatches under it —
  // the two "what does this card look like" choices live together.
  tools.push({
    id: "theme",
    label: "THEME",
    icon: <SquaresFourIcon {...ICON_PROPS} />,
    content: (
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
                  "data-[pressed]:scale-110 data-[pressed]:ring-2"
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
            <ArrowCounterClockwiseIcon className="size-3.5" weight="duotone" />
            Reset
          </Button>
        </div>
      </ControlBlock>
    ),
  });

  // The photo is the most important control — lead with it, and make the empty
  // state inviting.
  tools.push({
    id: "photo",
    label: "PHOTO",
    icon: <ImageIcon {...ICON_PROPS} />,
    content: (
      <ControlBlock label="BACKGROUND PHOTO">
        <PhotoControl
          disabled={!photoSupported}
          onChange={onPhotoChange}
          photoUrl={photoUrl}
          prominent={photoSupported}
        />
        {photoSupported ? null : (
          <p className="caption-micro mt-2">
            {themeLabel} theme has no room for a photo
          </p>
        )}
        {photoExtras}
        {filterControl ? (
          <div className="mt-3">
            <div className="caption-micro mb-1.5">FILTER</div>
            {filterControl}
          </div>
        ) : null}
      </ControlBlock>
    ),
  });

  if (moodControl) {
    tools.push({
      id: "mood",
      label: "MOOD",
      icon: <SunHorizonIcon {...ICON_PROPS} />,
      content: <ControlBlock label="MOOD">{moodControl}</ControlBlock>,
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

  if (mode === "carousel") {
    tools.push({
      id: "marks",
      label: "MARKS",
      icon: <StarIcon {...ICON_PROPS} />,
      content: (
        <ControlBlock label="CAROUSEL MARKS">
          <div className="mt-2 flex flex-col gap-2.5">
            {CAROUSEL_TOGGLES.map(renderToggle)}
          </div>
        </ControlBlock>
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
          <Select
            onValueChange={(v) => onSportChange(v as Sport)}
            value={data.sport}
          >
            <SelectTrigger aria-label="Sport" className="w-full">
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
