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
import type { ActivityData, ActivitySource } from "@/lib/activity";
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

const EditState = dynamic(
  async () => {
    const m = await loadEditState();
    return m.EditState;
  },
  {
    loading: StateFallback,
    ssr: false,
  }
);
const CarouselEditState = dynamic(
  async () => {
    const m = await loadCarouselEditState();
    return m.CarouselEditState;
  },
  { loading: StateFallback, ssr: false }
);
const ExportSheet = dynamic(
  async () => {
    const m = await loadExportSheet();
    return m.ExportSheet;
  },
  {
    loading: StateFallback,
    ssr: false,
  }
);
const CarouselExportSheet = dynamic(
  async () => {
    const m = await loadCarouselExportSheet();
    return m.CarouselExportSheet;
  },
  { loading: StateFallback, ssr: false }
);
const StravaPicker = dynamic(
  async () => {
    const m = await import("@/components/app/strava-picker");
    return m.StravaPicker;
  },
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
  const upper = date === undefined || date === "" ? "" : formatDateUpper(date);
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

const Home = () => {
  const [state, setState] = useState<AppState>("empty");
  // Set after the Strava OAuth round-trip so the empty state opens the wizard
  // with the Strava picker showing (instead of a separate full-screen state).
  const [autoStravaPicker, setAutoStravaPicker] = useState(false);
  const [data, setData] = useState<ActivityData | null>(null);
  // Which platform format the single-card stage previews (the export sheet
  // still offers the full set); the 4:5 master is the default.
  const [previewFormat, setPreviewFormat] =
    useState<ExportFormatId>(DEFAULT_FORMAT_ID);
  // Theme picks, colour, visibility, per-theme configs and mode — restored
  // from and persisted to localStorage (see the hook).
  const prefs = useEditorPrefs(data?.athleteName);
  const { carouselTheme, colorChoice, mode, theme, visibility } = prefs;

  const carousel = useCarousel(CAROUSEL_THEMES[carouselTheme].panels.length);

  // Both families express a theme through the same descriptor core
  // (`ThemeBase`): one lookup supplies identity, params, colour and photo
  // policy for whichever mode is editing. The single-card `strata` and the
  // carousel `strata` share the id, so they share one config slot.
  const activeTheme: ThemeBase =
    mode === "carousel"
      ? CAROUSEL_THEMES[carouselTheme]
      : SINGLE_CARD_THEMES[theme];
  // The background photo cluster: object URL + pan/zoom + filter effects,
  // the resize-on-adopt (stale results dropped) and the object-URL revocation
  // lifecycle (see the hook). A new photo adopts the active theme's policy.
  const photo = useCardPhoto(activeTheme.photo);
  const activeConfig = coerceConfig(
    activeTheme.defaults,
    activeTheme.params,
    prefs.themeConfigs[activeTheme.id]
  );

  // Colour resolution: the active theme's policy supplies the default scheme
  // and (for photo-first themes like Exposure) a default photo-derived choice;
  // the user's explicit choice overrides. A photo-kind choice resolves through
  // the extracted palette and falls back to the theme default while none is
  // available. One palette extraction serves the whole app (the colour
  // control's swatches + any photo-derived choice).
  const effectiveColorChoice = effectiveChoiceFor(activeTheme, colorChoice);
  const photoPalette = useImagePalette(photo.url);
  const colors = resolveColors(
    effectiveColorChoice,
    activeTheme.colors.default,
    photoPalette
  );

  // After the Strava OAuth round-trip we land on `/?strava=...` — toast the
  // outcome and, on success, open the wizard with the Strava picker showing
  // (and warm the editor chunk, as any wizard opening does).
  useStravaReturnToast(() => {
    setAutoStravaPicker(true);
    preloadEditor();
  });

  // Into the editor. Its next stop is the export sheet, so warm that chunk
  // (and, through it, the export pipeline) while the user edits.
  const enterEditor = () => {
    preloadExport();
    setState("edit");
  };

  const adoptActivity = (next: ActivityData) => {
    setData(next);
    carousel.regenerate();
    enterEditor();
  };

  const handleFilesLoaded = (parts: ParsedActivity[]) => {
    adoptActivity(adoptParts(parts, "upload", prefs.getPersistedAthleteName()));
  };

  const handleStravaActivityLoaded = (parts: ParsedActivity[]) => {
    adoptActivity(adoptParts(parts, "strava", prefs.getPersistedAthleteName()));
  };

  const handleOpenStravaPicker = () => {
    setState("picking-strava");
  };

  const handleCancelStravaPicker = () => {
    setAutoStravaPicker(false);
    setState("empty");
  };

  const updateData = (patch: Partial<ActivityData>) => {
    setData((prev) => (prev === null ? prev : { ...prev, ...patch }));
  };

  const handleAthleteNameChange = (name: string) => {
    prefs.rememberAthleteName(name);
    updateData({ athleteName: name });
  };

  // Selecting a theme (either family) applies its photo policy: its default
  // backdrop state (STRATA / Data / Triathlon default OFF; the photo-led
  // themes default ON) and — when there's a photo to affect — its signature
  // filter + grain. The user can still change both afterwards.
  const applyThemePhotoPolicy = (policy: ThemePhotoPolicy) => {
    prefs.setPhotoBackdrop(policy.defaultOn);
    if (photo.url !== null && photo.url !== "") {
      photo.applyPolicyEffects(policy);
    }
  };

  const handlePhotoChange = async (file: File | null) => {
    // A new (or removed) photo invalidates any previous pan/zoom. A fresh photo
    // adopts the active theme's photo policy from scratch (effects reset, not
    // carried over from the previous photo). The hook caps oversized photos
    // first, reads the policy once the capped photo lands, and drops a result
    // a newer pick/removal has superseded (`null`).
    const policy = await photo.adopt(file);
    if (file !== null && policy !== null) {
      prefs.setPhotoBackdrop(policy.defaultOn);
    }
  };

  const handleSingleThemeChange = (next: ThemeId) => {
    prefs.setTheme(next);
    applyThemePhotoPolicy(SINGLE_CARD_THEMES[next].photo);
  };

  const handleCarouselThemeChange = (id: CarouselThemeId) => {
    prefs.setCarouselTheme(id);
    applyThemePhotoPolicy(CAROUSEL_THEMES[id].photo);
  };

  // The onboarding wizard hands back a parsed upload or a sample, plus an
  // optional background photo, then drops the user into the editor pre-filled.
  const handleOnboardingComplete = ({
    parts,
    photo: onboardingPhoto,
    sample,
    source,
  }: OnboardingResult) => {
    const next =
      parts === undefined
        ? sample
        : adoptParts(parts, source, prefs.getPersistedAthleteName());
    if (next === undefined) {
      return;
    }
    if (onboardingPhoto !== null) {
      // Fire-and-forget: capping the photo is asynchronous, and the editor
      // opens on the activity alone — the photo lands a frame later.
      void handlePhotoChange(onboardingPhoto);
    }
    adoptActivity(next);
  };

  const handleModeChange = (next: CardMode) => {
    prefs.setMode(next);
  };

  const handleDownload = () => {
    setState("download");
  };

  const handleNew = () => {
    setData(null);
    // The hook's effect cleanup revokes the dropped object URL.
    photo.clear();
    setAutoStravaPicker(false);
    setState("empty");
  };

  const visibleData = data === null ? null : applyVisibility(data, visibility);

  // Everything the editors share, in one object (see EditorSession). Built
  // per render with the mode-appropriate availability + colour policy.
  const session: EditorSession | null =
    data === null || visibleData === null
      ? null
      : {
          athleteName: data.athleteName,
          available: themeAvailability(data, activeTheme),
          color: {
            adjustable: activeTheme.colors.userAdjustable,
            choice: effectiveColorChoice,
            isDefault: colorChoice === null,
            onChange: prefs.setColorChoice,
            scheme: colors,
          },
          config: {
            onChange: (next) => {
              prefs.updateThemeConfig(activeTheme.id, next);
            },
            palette: photoPalette,
            params: activeTheme.params,
            value: activeConfig,
          },
          data: visibleData,
          location: data.location,
          onAthleteNameChange: handleAthleteNameChange,
          onFilesLoaded: handleFilesLoaded,
          onLocationChange: (location) => {
            updateData({ location });
          },
          onOpenStravaPicker: handleOpenStravaPicker,
          onSportChange: (sport) => {
            updateData({ sport });
          },
          onTitleChange: (title) => {
            updateData({ title });
          },
          onVisibilityChange: prefs.setVisibility,
          photo: {
            effects: photo.effects,
            onChange: (file) => {
              void handlePhotoChange(file);
            },
            onEffectsChange: photo.setEffects,
            onTransformChange: photo.setTransform,
            transform: photo.transform,
            url: photo.url,
          },
          title: data.title,
          visibility,
        };

  return (
    <div
      className={cn(
        "bg-background text-foreground relative flex flex-col overflow-hidden",
        // The editor is a non-scrolling app-shell pinned to the dynamic viewport
        // on mobile (panels scroll internally, the page doesn't). The empty
        // state is a scroll-snap landing that owns its own internal scroller, so
        // it's pinned to the viewport too. Every other screen keeps its natural,
        // scrollable height.
        // Desktop: drop the app-shell's `overflow-hidden` (a scroll container
        // that never scrolls — the window does) so descendant `position:sticky`
        // (the preview and the export dock) resolves against the viewport
        // instead of being trapped and pinned-to-nothing.
        state === "edit" &&
          "h-dvh lg:h-auto lg:min-h-screen lg:overflow-visible",
        state === "empty" && "h-dvh",
        state !== "edit" && state !== "empty" && "min-h-screen"
      )}
    >
      {state === "empty" ? (
        <EmptyState
          autoStravaPicker={autoStravaPicker}
          onComplete={handleOnboardingComplete}
          onIntent={preloadEditor}
        />
      ) : null}
      {/* The empty-state landing renders its own wordmark header per section,
          the editor has its own top bar, and the export sheet carries its own
          heading — so the shared (absolute) header only shows on the Strava
          picker. "Compatible with Strava" (§4) sits on the Strava-facing
          surfaces: the empty landing carries the mark in its own footer
          section; the picker uses the standalone footer. The editor/download
          stay clean — the card carries no Strava mark by brand rule. */}
      {state === "picking-strava" ? (
        <>
          <Header date={data?.date} />
          <StravaPicker
            onActivityLoaded={handleStravaActivityLoaded}
            onCancel={handleCancelStravaPicker}
            onReauth={handleConnectStrava}
          />
          <StravaFooter />
        </>
      ) : null}
      {state === "edit" && session !== null ? (
        <EditView
          carousel={carousel}
          carouselTheme={carouselTheme}
          mode={mode}
          onCarouselThemeChange={handleCarouselThemeChange}
          onExport={handleDownload}
          onModeChange={handleModeChange}
          onPreviewFormatChange={setPreviewFormat}
          onSingleThemeChange={handleSingleThemeChange}
          previewFormat={previewFormat}
          session={session}
          theme={theme}
        />
      ) : null}
      {state === "download" && visibleData !== null ? (
        <ExportView
          carouselTheme={carouselTheme}
          colors={colors}
          config={activeConfig}
          count={carousel.count}
          data={visibleData}
          mode={mode}
          onKeepEditing={enterEditor}
          onNew={handleNew}
          photo={photo}
          routeCoordinates={data?.routeCoordinates}
          theme={theme}
          visibility={visibility}
        />
      ) : null}
    </div>
  );
};

export default Home;
