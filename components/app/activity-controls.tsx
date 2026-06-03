"use client";

// Shared sidebar body used by both the Single Card and Carousel editors. Every
// overlay element has a switch here, grouped into collapsible sections. A toggle
// is disabled when the current activity has no data for it (`available`), and
// distance/time are locked on for the Single Card (its irreducible core).

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useId } from "react";
import type { CardMode } from "@/components/app/mode-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/visibility";
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

interface ActivityControlsProps {
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
  onLocationChange: (location: string) => void;
  onPhotoChange: (file: File | null) => void;
  onSportChange: (sport: Sport) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  /** rendered inside the photo block (effects / reposition hint) */
  photoExtras?: React.ReactNode;
  photoSupported: boolean;
  photoUrl: string | null;
  /** rendered after the photo block (e.g. the single-card mood picker) */
  slotAfterPhoto?: React.ReactNode;
  /** label used in "<theme> has no room for a photo" copy */
  themeLabel: string;
  /** raw (unstripped) title for the editable input */
  title: string;
  visibility: Visibility;
}

export function ActivityControls({
  data,
  mode,
  themeLabel,
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
  photoExtras,
  slotAfterPhoto,
  title,
}: ActivityControlsProps) {
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

  return (
    <>
      {/* The photo is the most important control — lead with it, and make the
          empty state inviting. */}
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
      </ControlBlock>

      {slotAfterPhoto}

      <ControlBlock label="ACCENT">
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
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

      {/* Text overlays — all styled the same, none more prominent than another. */}
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

      <Accordion
        className="border-foreground/10 border-t"
        defaultValue={["stats", "visuals", "carousel"]}
        multiple
      >
        <AccordionItem value="stats">
          <AccordionTrigger className="caption-label py-3 hover:no-underline">
            Stats
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2.5">
              {STAT_TOGGLES.map(renderToggle)}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="visuals">
          <AccordionTrigger className="caption-label py-3 hover:no-underline">
            Visualisations
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2.5">
              {VIZ_TOGGLES.map(renderToggle)}
            </div>
          </AccordionContent>
        </AccordionItem>

        {mode === "carousel" ? (
          <AccordionItem value="carousel">
            <AccordionTrigger className="caption-label py-3 hover:no-underline">
              Carousel marks
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2.5">
                {CAROUSEL_TOGGLES.map(renderToggle)}
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : null}
      </Accordion>

      {/* Activity metadata — least-touched, so it sits at the bottom. */}
      <ControlBlock label="ACTIVITY">
        <div className="mt-2 flex flex-col gap-4">
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
    </>
  );
}
