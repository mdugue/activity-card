"use client";

import { useEffect, useRef, useState } from "react";
import { EffortWordmark } from "@/components/app/effort-wordmark";
import { EmptyState } from "@/components/app/empty-state";
import { ExportSheet } from "@/components/app/export-sheet";
import { type CardMode, ModeToggle } from "@/components/app/mode-toggle";
import type { OnboardingResult } from "@/components/app/onboarding-wizard";
import {
  loadPersistedUi,
  migrateCarouselTheme,
  migrateColorChoice,
  migrateThemeConfigs,
  savePersistedUi,
} from "@/components/app/persisted-ui";
import { StravaFooter } from "@/components/app/strava-footer";
import { StravaPicker } from "@/components/app/strava-picker";
import { useCardPhoto } from "@/hooks/use-card-photo";
import { useCarousel } from "@/hooks/use-carousel";
import { useImagePalette } from "@/hooks/use-image-palette";
import { useStravaReturnToast } from "@/hooks/use-strava-return-toast";
import type { ActivityData, ActivitySource, Sport } from "@/lib/activity";
import { assembleTriathlon } from "@/lib/assemble-triathlon";
import { formatDateUpper } from "@/lib/format";
import type { ParsedActivity } from "@/lib/parse-activity";
import { cn } from "@/lib/utils";
import {
  CAROUSEL_THEMES,
  type CarouselThemeId,
  DEFAULT_CAROUSEL_THEME,
} from "@/theme/carousel/registry";
import { type ColorChoice, resolveColors } from "@/theme/core/colors";
import {
  DEFAULT_FORMAT_ID,
  type ExportFormatId,
  getFormat,
} from "@/theme/core/export-formats";
import { coerceConfig } from "@/theme/core/params/resolve";
import {
  effectiveChoiceFor,
  type ThemeBase,
  type ThemePhotoPolicy,
} from "@/theme/core/theme-contract";
import {
  applyVisibility,
  DEFAULT_VISIBILITY,
  themeAvailability,
  type Visibility,
} from "@/theme/core/visibility";
import { CarouselEditState } from "@/theme/editor/carousel-edit-state";
import { EditState } from "@/theme/editor/edit-state";
import type { EditorSession } from "@/theme/editor/editor-session";
import type { ThemeId } from "@/theme/editor/render-theme";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";

type AppState = "empty" | "picking-strava" | "edit" | "download";

function adoptParsed(
  parsed: ParsedActivity,
  persistedAthleteName?: string,
  source: ActivitySource = "upload"
): ActivityData {
  // A real activity carries ONLY what its file contains — never sample
  // fixtures. Themes render conditionally on optional fields, so anything the
  // parser couldn't compute (splits, zones, streams) simply doesn't appear.
  return {
    ...parsed,
    athleteName: parsed.athleteName || persistedAthleteName || "",
    source,
  };
}

export default function Home() {
  const [state, setState] = useState<AppState>("empty");
  // Set after the Strava OAuth round-trip so the empty state opens the wizard
  // with the Strava picker showing (instead of a separate full-screen state).
  const [autoStravaPicker, setAutoStravaPicker] = useState(false);
  const [data, setData] = useState<ActivityData | null>(null);
  const [theme, setTheme] = useState<ThemeId>("altitude");
  // Which platform format the single-card stage previews (the export sheet
  // still offers the full set); the 4:5 master is the default.
  const [previewFormat, setPreviewFormat] =
    useState<ExportFormatId>(DEFAULT_FORMAT_ID);
  // Carousel themes have their own id space (Trace, Ascent, …), so the
  // carousel keeps its own selection separate from the single-card theme.
  const [carouselTheme, setCarouselTheme] = useState<CarouselThemeId>(
    DEFAULT_CAROUSEL_THEME
  );
  // The background photo cluster: object URL + pan/zoom + filter effects,
  // including the object-URL revocation lifecycle (see the hook).
  const photo = useCardPhoto();
  // The user's colour choice — a preset scheme or a photo-derived strategy.
  // `null` means "the active theme's default", so each theme keeps its own
  // signature colours until the user explicitly picks.
  const [colorChoice, setColorChoice] = useState<ColorChoice | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  // Per-theme parameter configs, keyed by theme/config key (e.g. "altitude",
  // "strata", "photo"). One generic slot replaces the per-theme config states;
  // `resolveThemeConfig` coerces each read so stale/garbage values are safe.
  const [themeConfigs, setThemeConfigs] = useState<Record<string, unknown>>({});

  const [mode, setMode] = useState<CardMode>("single");
  const carousel = useCarousel(CAROUSEL_THEMES[carouselTheme].panels.length);
  // Held outside `data` so it survives between activities and can seed
  // `adoptParsed` when the parsed file lacks an athlete name.
  const persistedAthleteNameRef = useRef<string | undefined>(undefined);

  // Both families express a theme through the same descriptor core
  // (`ThemeBase`): one lookup supplies identity, params, colour and photo
  // policy for whichever mode is editing. The single-card `strata` and the
  // carousel `strata` share the id, so they share one config slot.
  const activeTheme: ThemeBase =
    mode === "carousel"
      ? CAROUSEL_THEMES[carouselTheme]
      : SINGLE_CARD_THEMES[theme];
  const activeConfig = coerceConfig(
    activeTheme.defaults,
    activeTheme.params,
    themeConfigs[activeTheme.id]
  );
  const setActiveConfig = (next: Record<string, unknown>) =>
    setThemeConfigs((prev) => ({ ...prev, [activeTheme.id]: next }));

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

  // Restore UI prefs (theme, accent, visibility, moods, athleteName) on mount.
  // Hydrating from localStorage is a legitimate cold-start sync; the
  // setState-in-effect rule's "fix" (useSyncExternalStore + a custom write
  // path) buys nothing over this small, one-shot read.
  useEffect(() => {
    const persisted = loadPersistedUi();
    /* eslint-disable react-hooks/set-state-in-effect */
    // Validate both ids against the current theme sets: a stale id from an
    // older build or hand-edited storage would otherwise throw downstream on
    // the registry lookup.
    if (persisted.theme && persisted.theme in SINGLE_CARD_THEMES) {
      setTheme(persisted.theme);
    }
    const migratedCarousel = migrateCarouselTheme(persisted);
    if (migratedCarousel) {
      setCarouselTheme(migratedCarousel.id);
    }
    const migratedChoice = migrateColorChoice(persisted);
    if (migratedChoice) {
      setColorChoice(migratedChoice);
    }
    if (persisted.visibility) {
      setVisibility({ ...DEFAULT_VISIBILITY, ...persisted.visibility });
    }
    const configs = migrateThemeConfigs(persisted, migratedCarousel);
    if (Object.keys(configs).length > 0) {
      setThemeConfigs(configs);
    }
    if (persisted.mode) {
      setMode(persisted.mode);
    }
    if (persisted.athleteName) {
      persistedAthleteNameRef.current = persisted.athleteName;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist on change. Athlete name comes from `data` (which the user edits
  // in-place), so it shares this effect rather than getting its own.
  useEffect(() => {
    savePersistedUi({
      theme,
      carouselTheme,
      colorChoice: colorChoice ?? undefined,
      visibility,
      themeConfigs,
      mode,
      athleteName: data?.athleteName || persistedAthleteNameRef.current,
    });
  }, [
    theme,
    carouselTheme,
    colorChoice,
    visibility,
    themeConfigs,
    mode,
    data?.athleteName,
  ]);

  // After the Strava OAuth round-trip we land on `/?strava=...` — toast the
  // outcome and, on success, open the wizard with the Strava picker showing.
  useStravaReturnToast(() => setAutoStravaPicker(true));

  const adoptParts = (
    parts: ParsedActivity[],
    source: ActivitySource
  ): ActivityData => {
    if (parts.length === 1) {
      return adoptParsed(parts[0], persistedAthleteNameRef.current, source);
    }
    const tri = assembleTriathlon(parts);
    // Seed athlete name on assembled triathlons too, since assembleTriathlon
    // pulls from the first parsed file which may be blank.
    return {
      ...tri,
      athleteName:
        tri.athleteName || persistedAthleteNameRef.current || tri.athleteName,
      source,
    };
  };

  const handleFilesLoaded = (parts: ParsedActivity[]) => {
    setData(adoptParts(parts, "upload"));
    carousel.regenerate();
    setState("edit");
  };

  const handleStravaActivityLoaded = (parts: ParsedActivity[]) => {
    setData(adoptParts(parts, "strava"));
    carousel.regenerate();
    setState("edit");
  };

  const handleConnectStrava = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/strava/authorize";
    }
  };

  const handleOpenStravaPicker = () => {
    setState("picking-strava");
  };

  const handleCancelStravaPicker = () => {
    setAutoStravaPicker(false);
    setState("empty");
  };

  const handleTitleChange = (title: string) => {
    setData((prev) => (prev ? { ...prev, title } : prev));
  };

  const handleSportChange = (sport: Sport) => {
    setData((prev) => (prev ? { ...prev, sport } : prev));
  };

  const handleAthleteNameChange = (name: string) => {
    persistedAthleteNameRef.current = name;
    setData((prev) => (prev ? { ...prev, athleteName: name } : prev));
  };

  const handleLocationChange = (location: string) => {
    setData((prev) => (prev ? { ...prev, location } : prev));
  };

  const activePhotoPolicy = activeTheme.photo;

  // Selecting a theme (either family) applies its photo policy: its default
  // backdrop state (STRATA / Data / Triathlon default OFF; the photo-led
  // themes default ON) and — when there's a photo to affect — its signature
  // filter + grain. The user can still change both afterwards.
  const applyThemePhotoPolicy = (policy: ThemePhotoPolicy) => {
    setVisibility((v) => ({ ...v, photoBackdrop: policy.defaultOn }));
    if (photo.url) {
      photo.applyPolicyEffects(policy);
    }
  };

  const handlePhotoChange = (file: File | null) => {
    // A new (or removed) photo invalidates any previous pan/zoom. A fresh photo
    // adopts the active theme's photo policy from scratch (effects reset, not
    // carried over from the previous photo).
    photo.adopt(file, activePhotoPolicy);
    if (file) {
      setVisibility((v) => ({
        ...v,
        photoBackdrop: activePhotoPolicy.defaultOn,
      }));
    }
  };

  const handleSingleThemeChange = (next: ThemeId) => {
    setTheme(next);
    applyThemePhotoPolicy(SINGLE_CARD_THEMES[next].photo);
  };

  // The onboarding wizard hands back a parsed upload or a sample, plus an
  // optional background photo, then drops the user into the editor pre-filled.
  const handleOnboardingComplete = ({
    parts,
    photo: onboardingPhoto,
    sample,
    source,
  }: OnboardingResult) => {
    const next = parts ? adoptParts(parts, source) : sample;
    if (!next) {
      return;
    }
    setData(next);
    if (onboardingPhoto) {
      handlePhotoChange(onboardingPhoto);
    }
    carousel.regenerate();
    setState("edit");
  };

  const handleCarouselThemeChange = (id: CarouselThemeId) => {
    setCarouselTheme(id);
    applyThemePhotoPolicy(CAROUSEL_THEMES[id].photo);
  };

  const handleDownload = () => {
    setState("download");
  };

  const handleKeepEditing = () => {
    setState("edit");
  };

  const handleNew = () => {
    setData(null);
    // The hook's effect cleanup revokes the dropped object URL.
    photo.clear();
    setAutoStravaPicker(false);
    setState("empty");
  };

  const visibleData = data ? applyVisibility(data, visibility) : data;

  // Everything the editors share, in one object (see EditorSession). Built
  // per render with the mode-appropriate availability + colour policy.
  const session: EditorSession | null =
    visibleData && data
      ? {
          data: visibleData,
          title: data.title,
          location: data.location,
          athleteName: data.athleteName,
          available:
            mode === "carousel"
              ? themeAvailability(data, CAROUSEL_THEMES[carouselTheme])
              : themeAvailability(data, SINGLE_CARD_THEMES[theme]),
          visibility,
          onVisibilityChange: setVisibility,
          onTitleChange: handleTitleChange,
          onLocationChange: handleLocationChange,
          onAthleteNameChange: handleAthleteNameChange,
          onSportChange: handleSportChange,
          onFilesLoaded: handleFilesLoaded,
          onOpenStravaPicker: handleOpenStravaPicker,
          color: {
            adjustable: activeTheme.colors.userAdjustable,
            choice: effectiveColorChoice,
            isDefault: colorChoice === null,
            onChange: setColorChoice,
            scheme: colors,
          },
          config: {
            onChange: setActiveConfig,
            palette: photoPalette,
            params: activeTheme.params,
            value: activeConfig,
          },
          photo: {
            effects: photo.effects,
            onChange: handlePhotoChange,
            onEffectsChange: photo.setEffects,
            onTransformChange: photo.setTransform,
            transform: photo.transform,
            url: photo.url,
          },
        }
      : null;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden bg-background text-foreground",
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
      {/* The empty-state landing renders its own wordmark header per section,
          the editor has its own top bar, and the export sheet carries its own
          heading — so the shared (absolute) header would overlap there. Show it
          only on the remaining non-editor screens (e.g. the Strava picker). */}
      {state === "edit" || state === "empty" || state === "download" ? null : (
        <Header date={data?.date} />
      )}
      {state === "empty" ? (
        <EmptyState
          autoStravaPicker={autoStravaPicker}
          onComplete={handleOnboardingComplete}
        />
      ) : null}
      {state === "picking-strava" ? (
        <StravaPicker
          onActivityLoaded={handleStravaActivityLoaded}
          onCancel={handleCancelStravaPicker}
          onReauth={handleConnectStrava}
        />
      ) : null}
      {state === "edit" && session ? (
        <div className="flex flex-1 flex-col max-lg:min-h-0">
          <EditTopBar mode={mode} onModeChange={setMode} />
          {mode === "carousel" ? (
            <CarouselEditState
              carousel={carousel}
              format={getFormat(previewFormat)}
              onFormatChange={setPreviewFormat}
              onThemeChange={handleCarouselThemeChange}
              session={session}
              theme={carouselTheme}
            />
          ) : (
            <EditState
              format={getFormat(previewFormat)}
              onExport={handleDownload}
              onFormatChange={setPreviewFormat}
              onThemeChange={handleSingleThemeChange}
              session={session}
              theme={theme}
            />
          )}
        </div>
      ) : null}
      {state === "download" && visibleData ? (
        <ExportSheet
          colors={colors}
          config={activeConfig}
          data={visibleData}
          imageTransform={photo.transform}
          onKeepEditing={handleKeepEditing}
          onNew={handleNew}
          photoBackdropEnabled={visibility.photoBackdrop}
          photoEffects={photo.effects}
          photoUrl={photo.url}
          routeCoordinates={data?.routeCoordinates}
          theme={theme}
        />
      ) : null}
      {/* "Compatible with Strava" (§4) on the Strava-facing surfaces. The empty
          landing carries the mark in its own footer section; the picker uses the
          standalone footer. The editor/download stay clean — the card carries no
          Strava mark by brand rule. */}
      {state === "picking-strava" ? <StravaFooter /> : null}
    </div>
  );
}

/**
 * The editor's top bar: the wordmark and the compact Carousel/Single Card
 * toggle on one line, with the activity control (name + source + swap, in a
 * popover) directly below. Replaces the standalone header + mode-toggle row so
 * the top stays tight on mobile and reads cleanly on desktop.
 */
function EditTopBar({
  mode,
  onModeChange,
}: {
  mode: CardMode;
  onModeChange: (mode: CardMode) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-6 pt-7 md:px-10">
      <EffortWordmark labelClassName="hidden sm:inline" size="sm" />
      <ModeToggle mode={mode} onModeChange={onModeChange} />
    </div>
  );
}

function Header({ date, status }: { date?: string; status?: string }) {
  const upper = date ? formatDateUpper(date) : "";
  return (
    <header className="absolute top-0 right-0 left-0 z-10 flex items-start justify-between px-6 pt-7 md:px-10">
      <EffortWordmark />
      {status ? (
        <div className="font-medium font-mono text-[10px] tracking-[0.22em] opacity-55 sm:text-[11px]">
          {status}
        </div>
      ) : (
        <div className="hidden font-medium font-mono text-[11px] tracking-[0.22em] opacity-55 sm:block">
          ACTIVITY CARD{upper ? ` · ${upper}` : ""}
        </div>
      )}
    </header>
  );
}
