"use client";

// Builds the shared list of editor categories (the `ControlTool[]` the
// ControlDeck renders) from the EditorSession + the active theme's parameter
// schema. The per-theme knobs are not special-cased: each theme declares
// `ParamDef`s (see `lib/params/`) and they render generically via
// `ThemeParamGroup`, filed into the category each param names
// (STYLE · LAYOUT · MARKS). Every overlay control — title, location, date, the
// stats/viz, the photo — is gated the same way, by `session.controls` (the
// theme's capability declaration): a control is hidden when the theme doesn't
// declare it, disabled when the activity has no data, else enabled. Both editors
// consume this hook; they differ only in `mode` (which picks the theme rail's
// id space) — the props discriminate on it.

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
import { ActivitySource } from "@/components/app/activity-source";
import type { ControlTool } from "@/components/app/control-deck";
import {
  ControlBlock,
  DetailField,
  PhotoControl,
  RichSelect,
  type RichSelectOption,
  ToggleRow,
} from "@/components/app/control-primitives";
import { StravaPhotoStrip } from "@/components/app/strava-photo-strip";
import type { Sport, StravaPhotoRef } from "@/lib/activity";
import { fetchStravaPhotoFile, stravaPhotoKey } from "@/lib/strava-photos";
import {
  THEME_ORDER as CAROUSEL_THEME_ORDER,
  CAROUSEL_THEMES,
  type CarouselThemeId,
} from "@/theme/carousel/registry";
import type { ParamCtx } from "@/theme/core/params/kinds";
import type { Visibility } from "@/theme/core/visibility";
import { ThemeRail } from "@/theme/editor/theme-rail";
import {
  THEME_ORDER as SINGLE_CARD_THEME_ORDER,
  SINGLE_CARD_THEMES,
  type ThemeId,
} from "@/theme/single-card";
import { ColorControl } from "./color-control";
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

// The PHOTO control: upload / pick a Strava photo, the shared "Use as
// background" switch (`photo` visibility flag), and the filter / transform
// presets while it's displayed. Self-contained so the Strava-pick state stays
// local; only mounted for themes that declare the `photo` capability.
function PhotoTool({
  session,
  onToggleBackdrop,
}: {
  onToggleBackdrop: (checked: boolean) => void;
  session: EditorSession;
}) {
  const { data, photo, visibility } = session;
  const [pickingStravaPhoto, setPickingStravaPhoto] = useState<string | null>(
    null
  );
  // One-click "use this Strava photo": download the full size through the proxy
  // and hand it to the same File pipeline an upload uses.
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
  const photoActive = Boolean(photo.url) && visibility.photo;
  const stravaPhotos = data.stravaPhotos ?? [];
  return (
    <ControlBlock label="BACKGROUND PHOTO">
      <PhotoControl onChange={photo.onChange} photoUrl={photo.url} prominent />
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
            checked={visibility.photo}
            label="Use as background"
            onCheckedChange={onToggleBackdrop}
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
  );
}

type UseActivityToolsProps = { session: EditorSession } & (
  | {
      mode: "single";
      themeId: ThemeId;
      onThemeChange: (themeId: ThemeId) => void;
    }
  | {
      mode: "carousel";
      themeId: CarouselThemeId;
      onThemeChange: (themeId: CarouselThemeId) => void;
    }
);

export function useActivityTools({
  mode,
  session,
  themeId,
  onThemeChange,
}: UseActivityToolsProps): ControlTool[] {
  const {
    data,
    title,
    location,
    athleteName,
    controls,
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

  // A control shows whenever the theme declares its capability (state is not
  // "hidden"); whether it's interactive depends on the activity having data.
  const shown = (key: keyof Visibility) => controls[key] !== "hidden";
  const anyShown = (defs: ToggleDef[]) => defs.some((d) => shown(d.key));

  const renderToggle = ({ key, label }: ToggleDef) => {
    const state = controls[key];
    if (state === "hidden") {
      return null;
    }
    const disabled = state === "disabled";
    return (
      <ToggleRow
        checked={!disabled && visibility[key]}
        disabled={disabled}
        disabledReason={disabled ? "Not recorded in this activity" : undefined}
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
          {mode === "single" ? (
            <ThemeRail
              labels={SINGLE_CARD_THEMES}
              onThemeChange={onThemeChange}
              order={SINGLE_CARD_THEME_ORDER}
              theme={themeId}
            />
          ) : (
            <ThemeRail
              labels={CAROUSEL_THEMES}
              onThemeChange={onThemeChange}
              order={CAROUSEL_THEME_ORDER}
              theme={themeId}
            />
          )}
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

  // The photo is a prominent control — shown only for themes that declare the
  // `photo` capability, adjustable via the same filter / grain / transform
  // presets in both modes. The "Use as background" switch is the shared `photo`
  // visibility flag; the adjustment controls only show while the photo is
  // actually displayed.
  if (shown("photo")) {
    tools.push({
      id: "photo",
      label: "PHOTO",
      icon: <ImageIcon {...ICON_PROPS} />,
      content: (
        <PhotoTool
          onToggleBackdrop={(c) => set("photo", c)}
          session={session}
        />
      ),
    });
  }

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

  // Text overlays — title / location / date, each shown only when the theme
  // renders it. All styled the same, none more prominent than another.
  if (shown("title") || shown("location") || shown("date")) {
    tools.push({
      id: "text",
      label: "TEXT",
      icon: <TextAaIcon {...ICON_PROPS} />,
      content: (
        <ControlBlock label="TEXT">
          <div className="mt-2 flex flex-col gap-4">
            {shown("title") ? (
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
            ) : null}
            {shown("location") ? (
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
            ) : null}
            {renderToggle({ key: "date", label: "Date" })}
          </div>
        </ControlBlock>
      ),
    });
  }

  // STATS + visualisations — only the metrics this theme renders, each disabled
  // when the activity didn't record it.
  if (anyShown(STAT_TOGGLES) || anyShown(VIZ_TOGGLES)) {
    tools.push({
      id: "stats",
      label: "STATS",
      icon: <ChartBarIcon {...ICON_PROPS} />,
      content: (
        <div className="flex flex-col gap-5">
          {anyShown(STAT_TOGGLES) ? (
            <ControlBlock label="STATS">
              <div className="mt-2 flex flex-col gap-2.5">
                {STAT_TOGGLES.map(renderToggle)}
              </div>
            </ControlBlock>
          ) : null}
          {anyShown(VIZ_TOGGLES) ? (
            <ControlBlock label="VISUALISATIONS">
              <div className="mt-2 flex flex-col gap-2.5">
                {VIZ_TOGGLES.map(renderToggle)}
              </div>
            </ControlBlock>
          ) : null}
        </div>
      ),
    });
  }

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
          {shown("athleteName") ? (
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
          ) : null}
        </div>
      </ControlBlock>
    ),
  });

  return tools;
}
