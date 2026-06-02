"use client";

// Shared sidebar body used by both the Single Card and Carousel editors.
// Capability flags (which fields the current view uses) and two slots
// (photoExtras, slotAfterPhoto) absorb the few differences, so the bulk of the
// two sidebars is literally the same component.

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

export const ACCENTS = [
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

const VISIBILITY_TOGGLES: VisibilityToggleDef[] = [
  { key: "heartRate", label: "Heart rate", capability: "usesHeartRate" },
  { key: "splits", label: "Splits", capability: "usesSplits" },
];

export interface ControlCapabilities {
  photoSupported: boolean;
  usesAthleteName: boolean;
  usesHeartRate: boolean;
  usesLocation: boolean;
  usesSplits: boolean;
}

interface ActivityControlsProps {
  accent: string;
  athleteName: string;
  caps: ControlCapabilities;
  data: ActivityData;
  location: string;
  onAccentChange: (accent: string) => void;
  onAthleteNameChange: (name: string) => void;
  onLocationChange: (location: string) => void;
  onPhotoChange: (file: File | null) => void;
  onSportChange: (sport: Sport) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  /** rendered inside the photo block (backdrop switch / reposition hint) */
  photoExtras?: React.ReactNode;
  photoUrl: string | null;
  /** rendered after the photo block (e.g. the single-card mood picker) */
  slotAfterPhoto?: React.ReactNode;
  /** label used in "<theme> theme doesn't show …" tooltips */
  themeLabel: string;
  visibility: Visibility;
}

export function ActivityControls({
  data,
  caps,
  themeLabel,
  athleteName,
  location,
  visibility,
  accent,
  photoUrl,
  onTitleChange,
  onSportChange,
  onAthleteNameChange,
  onLocationChange,
  onVisibilityChange,
  onAccentChange,
  onPhotoChange,
  photoExtras,
  slotAfterPhoto,
}: ActivityControlsProps) {
  const titleId = useId();
  const athleteId = useId();
  const locationId = useId();

  return (
    <>
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
            disabled={!caps.usesAthleteName}
            disabledReason={`${themeLabel} theme doesn't show athlete name`}
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
            disabled={!caps.usesLocation}
            disabledReason={`${themeLabel} theme doesn't show location`}
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
          disabled={!caps.photoSupported}
          onChange={onPhotoChange}
          photoUrl={photoUrl}
        />
        {caps.photoSupported ? null : (
          <p className="caption-micro mt-2">
            {themeLabel} theme has no room for a photo
          </p>
        )}
        {photoExtras}
      </ControlBlock>

      {slotAfterPhoto}

      <ControlBlock label="EXTRA METRICS">
        <div className="mt-3 flex flex-col gap-2.5">
          {VISIBILITY_TOGGLES.map((t) => {
            const supported = caps[t.capability];
            return (
              <ToggleRow
                checked={visibility[t.key]}
                disabled={!supported}
                disabledReason={`${themeLabel} theme doesn't use ${t.label.toLowerCase()}`}
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
    </>
  );
}
