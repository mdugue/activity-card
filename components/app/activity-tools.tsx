"use client";

// Builds the shared list of editor categories (the `ControlTool[]` the
// ControlDeck renders) from the EditorSession + the active theme's parameter
// schema. The per-theme knobs are not special-cased: each theme declares
// `ParamDef`s (see `lib/params/`) and they render generically via
// `ThemeParamGroup`, filed into the category each param names
// (STYLE · LAYOUT · MARKS). Shared controls — the theme rail, colour, photo,
// text, stats, marks, activity — round out the groups. Both editors consume
// this hook; they differ only in `mode` and the theme rail they pass.

import {
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
import { useId, useState } from "react";
import { toast } from "sonner";
import type { ControlTool } from "@/components/app/control-deck";
import type { CardMode } from "@/components/app/mode-toggle";
import { StravaPhotoStrip } from "@/components/app/strava-photo-strip";
import type { Sport, StravaPhotoRef } from "@/lib/activity";
import type { ParamCtx } from "@/lib/params/kinds";
import { fetchStravaPhotoFile, stravaPhotoKey } from "@/lib/strava-photos";
import type { Visibility } from "@/lib/visibility";
import { ActivitySource } from "./activity-source";
import { ColorControl } from "./color-control";
import {
  ControlBlock,
  DetailField,
  PhotoControl,
  RichSelect,
  type RichSelectOption,
  ToggleRow,
} from "./control-primitives";
import type { EditorSession } from "./editor-session";
import {
  PhotoFilterControl,
  PhotoTransformControls,
} from "./photo-effects-controls";
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

interface UseActivityToolsProps {
  mode: CardMode;
  session: EditorSession;
  /** the theme rail for this mode (rendered at the top of the STYLE section) */
  themeControl: React.ReactNode;
}

export function useActivityTools({
  mode,
  session,
  themeControl,
}: UseActivityToolsProps): ControlTool[] {
  const {
    data,
    title,
    location,
    athleteName,
    available,
    visibility,
    onTitleChange,
    onLocationChange,
    onAthleteNameChange,
    onSportChange,
    onVisibilityChange,
    onFilesLoaded,
    onOpenStravaPicker,
    color,
    config,
    photo,
  } = session;
  const paramCtx: ParamCtx = { data, palette: config.palette };
  const titleId = useId();
  const athleteId = useId();
  const locationId = useId();

  const set = (key: keyof Visibility, checked: boolean) =>
    onVisibilityChange({ ...visibility, [key]: checked });

  // One-click "use this Strava photo": download the full size through the
  // proxy and hand it to the same File pipeline an upload uses.
  const [pickingStravaPhoto, setPickingStravaPhoto] = useState<string | null>(
    null
  );
  const pickStravaPhoto = async (ref: StravaPhotoRef) => {
    if (pickingStravaPhoto) {
      return;
    }
    setPickingStravaPhoto(stravaPhotoKey(ref));
    try {
      const file = await fetchStravaPhotoFile(ref);
      photo.onChange(file);
    } catch {
      toast.error("Couldn't load the photo from Strava.");
    } finally {
      setPickingStravaPhoto(null);
    }
  };

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
      config={config.value}
      ctx={paramCtx}
      group={group}
      onChange={config.onChange}
      params={config.params}
    />
  );

  const tools: ControlTool[] = [];

  // STYLE leads: the theme rail, the unified colour control (static presets +
  // photo-derived schemes, hidden for fixed-palette themes), then any STYLE
  // params the theme exposes (atmosphere). The "what does this card look like"
  // choices live together.
  tools.push({
    id: "style",
    label: "STYLE",
    icon: <PaletteIcon {...ICON_PROPS} />,
    content: (
      <div className="flex flex-col gap-5">
        <ControlBlock label="THEME">
          {themeControl}
          {color.adjustable ? (
            <ColorControl
              choice={color.choice}
              isDefault={color.isDefault}
              onChange={color.onChange}
              palette={photo.url ? config.palette : null}
            />
          ) : null}
        </ControlBlock>
        {paramGroup("style")}
      </div>
    ),
  });

  // The photo is a prominent control — every theme can show one, adjustable via
  // the same filter / grain / transform presets in both modes. The "Use as
  // background" switch is the shared `photoBackdrop` visibility flag; the
  // adjustment controls only show while the photo is actually displayed.
  const photoActive = Boolean(photo.url) && visibility.photoBackdrop;
  const stravaPhotos = data.stravaPhotos ?? [];
  tools.push({
    id: "photo",
    label: "PHOTO",
    icon: <ImageIcon {...ICON_PROPS} />,
    content: (
      <ControlBlock label="BACKGROUND PHOTO">
        <PhotoControl
          onChange={photo.onChange}
          photoUrl={photo.url}
          prominent
        />
        {stravaPhotos.length > 0 ? (
          <div className="mt-3">
            <div className="caption-micro mb-1.5">FROM STRAVA</div>
            <StravaPhotoStrip
              onPick={pickStravaPhoto}
              photos={stravaPhotos}
              pickingKey={pickingStravaPhoto}
            />
          </div>
        ) : null}
        {photo.url ? (
          <div className="mt-3">
            <ToggleRow
              checked={visibility.photoBackdrop}
              label="Use as background"
              onCheckedChange={(c) => set("photoBackdrop", c)}
            />
          </div>
        ) : null}
        {photoActive ? (
          <>
            <p className="caption-micro mt-2">
              Tap “Adjust” on the preview to move &amp; zoom
            </p>
            <div className="mt-3">
              <div className="caption-micro mb-1.5">FILTER</div>
              <PhotoFilterControl
                effects={photo.effects}
                onChange={photo.onEffectsChange}
              />
            </div>
            <PhotoTransformControls
              effects={photo.effects}
              onChange={photo.onEffectsChange}
            />
          </>
        ) : null}
      </ControlBlock>
    ),
  });

  // LAYOUT — composition & type knobs the theme exposes (headline / font /
  // position / treatment / density). Only present when the theme has any.
  if (themeDeclaresGroup(config.params, "layout")) {
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

  // MARKS — annotations the theme exposes as MARKS params: the carousel chrome
  // (effort mark, page numbers — appended to every carousel theme by
  // `defineCarouselTheme`) plus any theme-specific markers (e.g. STRATA's
  // peak/direction legend). All render generically through the param system —
  // no per-mode special case, no carousel-only flag in the shared Visibility.
  if (themeDeclaresGroup(config.params, "marks")) {
    tools.push({
      id: "marks",
      label: "MARKS",
      icon: <StarIcon {...ICON_PROPS} />,
      content: (
        <ControlBlock label="MARKERS">
          <div className="mt-2">{paramGroup("marks")}</div>
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
