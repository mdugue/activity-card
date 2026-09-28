"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { EffortWordmark } from "@/components/app/effort-wordmark";
import { EmptyState } from "@/components/app/empty-state";
import { ModeToggle } from "@/components/app/mode-toggle";
import type { CardMode } from "@/components/app/mode-toggle";
import type { OnboardingResult } from "@/components/app/onboarding-wizard";
import { StravaFooter } from "@/components/app/strava-footer";
import { useCardPhoto } from "@/hooks/use-card-photo";
import { useCarousel } from "@/hooks/use-carousel";
import type { CarouselController } from "@/hooks/use-carousel";
import { useEditorPrefs } from "@/hooks/use-editor-prefs";
import { useImagePalette } from "@/hooks/use-image-palette";
import { useStravaReturnToast } from "@/hooks/use-strava-return-toast";
import type { ActivityData, ActivitySource, Sport } from "@/lib/activity";
import { assembleTriathlon } from "@/lib/assemble-triathlon";
import { formatDateUpper } from "@/lib/format";
import type { ParsedActivity } from "@/lib/parse-activity";
import { cn } from "@/lib/utils";
import { CAROUSEL_THEMES } from "@/theme/carousel/registry";
import type { CarouselThemeId } from "@/theme/carousel/registry";
import { resolveColors } from "@/theme/core/colors";
import type { ColorScheme } from "@/theme/core/colors";
import { DEFAULT_FORMAT_ID, getFormat } from "@/theme/core/export-formats";
import type { ExportFormatId } from "@/theme/core/export-formats";
import type { ThemeConfig } from "@/theme/core/params/kinds";
import { coerceConfig } from "@/theme/core/params/resolve";
import { effectiveChoiceFor } from "@/theme/core/theme-contract";
import type { ThemeBase, ThemePhotoPolicy } from "@/theme/core/theme-contract";
import { applyVisibility, themeAvailability } from "@/theme/core/visibility";
import type { Visibility } from "@/theme/core/visibility";
import type { EditorSession } from "@/theme/editor/editor-session";
import type { ThemeId } from "@/theme/editor/render-theme";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";

type AppState = "empty" | "picking-strava" | "edit" | "download";

// Code-split by app state: the landing only needs the empty state, so the
// editor, the Strava picker and the export sheets (which pull the snapdom
// export pipeline) load as separate chunks. Each loader is also called ahead of
// time on user intent (see `preloadEditor` / `preloadExport`) so the chunk is
// normally in cache before the state flips; the fallback only holds the
// layout slot for the rare case it isn't.
const loadEditState = async () => await import("@/theme/editor/edit-state");
const loadCarouselEditState = async () =>
  await import("@/theme/editor/carousel-edit-state");
const loadExportSheet = async () =>
  await import("@/components/app/export-sheet");
const loadCarouselExportSheet = async () =>
  await import("@/components/app/carousel-export-sheet");

const preloadEditor = (): void => {
  void loadEditState();
  void loadCarouselEditState();
};

const preloadExport = (): void => {
  void loadExportSheet();
  void loadCarouselExportSheet();
};

const handleConnectStrava = (): void => {
  if (typeof window !== "undefined") {
    window.location.href = "/api/strava/authorize";
  }
};

/** Holds the state's flex slot while its chunk loads — no collapse/jump. */
const StateFallback = () => <div aria-busy className="flex flex-1 flex-col" />;

const EditState = dynamic(async () => (await loadEditState()).EditState, {
  loading: StateFallback,
  ssr: false,
});
const CarouselEditState = dynamic(
  async () => (await loadCarouselEditState()).CarouselEditState,
  { loading: StateFallback, ssr: false }
);
const ExportSheet = dynamic(async () => (await loadExportSheet()).ExportSheet, {
  loading: StateFallback,
  ssr: false,
});
const CarouselExportSheet = dynamic(
  async () => (await loadCarouselExportSheet()).CarouselExportSheet,
  { loading: StateFallback, ssr: false }
);
const StravaPicker = dynamic(
  async () => (await import("@/components/app/strava-picker")).StravaPicker,
  { loading: StateFallback, ssr: false }
);

/** `s` when it holds text, `undefined` when it's empty — so `??` chains fall
 *  through blank names the way a truthiness check would. */
const nonEmpty = (s: string | undefined): string | undefined =>
  s === "" ? undefined : s;

const adoptParsed = (
  parsed: ParsedActivity,
  persistedAthleteName: string,
  source: ActivitySource
): ActivityData =>
  // A real activity carries ONLY what its file contains — never sample
  // fixtures. Themes render conditionally on optional fields, so anything the
  // parser couldn't compute (splits, zones, streams) simply doesn't appear.
  ({
    ...parsed,
    athleteName: nonEmpty(parsed.athleteName) ?? persistedAthleteName,
    source,
  });

/** Adopt one parsed file as-is, or several as an assembled triathlon. */
const adoptParts = (
  parts: ParsedActivity[],
  source: ActivitySource,
  persistedAthleteName: string
): ActivityData => {
  if (parts.length === 1) {
    return adoptParsed(parts[0], persistedAthleteName, source);
  }
  const tri = assembleTriathlon(parts);
  // Seed athlete name on assembled triathlons too, since assembleTriathlon
  // pulls from the first parsed file which may be blank.
  return {
    ...tri,
    athleteName:
      nonEmpty(tri.athleteName) ??
      nonEmpty(persistedAthleteName) ??
      tri.athleteName,
    source,
  };
};

/**
 * The export overview, picked by mode. Both modes are reached the same way (the
 * editor's Export action → the `download` state) and share the same sheet chrome;
 * the carousel slices its strip per format, the single card exports one card.
 */
const ExportView = ({
  mode,
  colors,
  config,
  count,
  data,
  photo,
  visibility,
  theme,
  carouselTheme,
  routeCoordinates,
  onKeepEditing,
  onNew,
}: {
  carouselTheme: CarouselThemeId;
  colors: ColorScheme;
  config: ThemeConfig;
  count: number;
  data: ActivityData;
  mode: CardMode;
  onKeepEditing: () => void;
  onNew: () => void;
  photo: ReturnType<typeof useCardPhoto>;
  routeCoordinates?: [number, number][];
  theme: ThemeId;
  visibility: Visibility;
}) => {
  if (mode === "carousel") {
    return (
      <CarouselExportSheet
        colors={colors}
        config={config}
        count={count}
        data={data}
        imageTransform={photo.transform}
        onKeepEditing={onKeepEditing}
        onNew={onNew}
        photoEffects={photo.effects}
        photoUrl={photo.url}
        routeCoordinates={routeCoordinates}
        theme={CAROUSEL_THEMES[carouselTheme]}
        visibility={visibility}
      />
    );
  }
  return (
    <ExportSheet
      colors={colors}
      config={config}
      data={data}
      imageTransform={photo.transform}
      onKeepEditing={onKeepEditing}
      onNew={onNew}
      photoBackdropEnabled={visibility.photoBackdrop}
      photoEffects={photo.effects}
      photoUrl={photo.url}
      routeCoordinates={routeCoordinates}
      theme={theme}
    />
  );
};

/**
 * The editor's top bar: the wordmark and the compact Carousel/Single Card
 * toggle on one line, with the activity control (name + source + swap, in a
 * popover) directly below. Replaces the standalone header + mode-toggle row so
 * the top stays tight on mobile and reads cleanly on desktop.
 */
const EditTopBar = ({
  mode,
  onModeChange,
}: {
  mode: CardMode;
  onModeChange: (mode: CardMode) => void;
}) => (
  <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-6 pt-7 md:px-10">
    <EffortWordmark labelClassName="hidden sm:inline" size="sm" />
    <div className="flex items-center gap-5">
      <Link
        className="hidden font-mono text-[11px] font-medium tracking-[0.16em] uppercase opacity-55 transition-opacity hover:opacity-100 md:inline"
        href="/tutorials"
      >
        Tutorials
      </Link>
      <ModeToggle mode={mode} onModeChange={onModeChange} />
    </div>
  </div>
);

const Header = ({ date, status }: { date?: string; status?: string }) => {
  const upper =
    date === undefined || date === "" ? "" : formatDateUpper(date);
  return (
    <header className="absolute top-0 right-0 left-0 z-10 flex items-start justify-between px-6 pt-7 md:px-10">
      <EffortWordmark />
      {status !== undefined && status !== "" ? (
        <div className="font-mono text-xs font-medium tracking-[0.22em] opacity-55">
          {status}
        </div>
      ) : (
        <div className="hidden font-mono text-xs font-medium tracking-[0.22em] opacity-55 sm:block">
          ACTIVITY CARD{upper === "" ? "" : ` · ${upper}`}
        </div>
      )}
    </header>
  );
};

/** The editor screen: the top bar over the mode's editor. */
const EditView = ({
  carousel,
  carouselTheme,
  mode,
  onCarouselThemeChange,
  onExport,
  onModeChange,
  onPreviewFormatChange,
  onSingleThemeChange,
  previewFormat,
  session,
  theme,
}: {
  carousel: CarouselController;
  carouselTheme: CarouselThemeId;
  mode: CardMode;
  onCarouselThemeChange: (id: CarouselThemeId) => void;
  onExport: () => void;
  onModeChange: (mode: CardMode) => void;
  onPreviewFormatChange: (id: ExportFormatId) => void;
  onSingleThemeChange: (id: ThemeId) => void;
  previewFormat: ExportFormatId;
  session: EditorSession;
  theme: ThemeId;
}) => (
  <div className="flex flex-1 flex-col max-lg:min-h-0">
    <EditTopBar mode={mode} onModeChange={onModeChange} />
    {mode === "carousel" ? (
      <CarouselEditState
        carousel={carousel}
        format={getFormat(previewFormat)}
        onExport={onExport}
        onFormatChange={onPreviewFormatChange}
        onThemeChange={onCarouselThemeChange}
        session={session}
        theme={carouselTheme}
      />
    ) : (
      <EditState
        format={getFormat(previewFormat)}
        onExport={onExport}
        onFormatChange={onPreviewFormatChange}
        onThemeChange={onSingleThemeChange}
        session={session}
        theme={theme}
      />
    )}
  </div>
);

