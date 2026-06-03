"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CarouselEditState } from "@/components/app/carousel-edit-state";
import { DownloadState } from "@/components/app/download-state";
import { EditState } from "@/components/app/edit-state";
import { EffortWordmark } from "@/components/app/effort-wordmark";
import { EmptyState } from "@/components/app/empty-state";
import { type CardMode, ModeToggle } from "@/components/app/mode-toggle";
import type { ThemeId } from "@/components/app/render-theme";
import {
  type ActivityData,
  type ActivitySource,
  SAMPLE_RIDE,
  SAMPLE_RUN,
  type Sport,
} from "@/components/app/sample-data";
import { StravaPicker } from "@/components/app/strava-picker";
import type { AltitudeMood } from "@/components/themes/altitude";
import { useCarousel } from "@/hooks/use-carousel";
import { useImagePalette } from "@/hooks/use-image-palette";
import { assembleTriathlon } from "@/lib/assemble-triathlon";
import { formatDateUpper } from "@/lib/format";
import { IDENTITY_TRANSFORM, type ImageTransform } from "@/lib/image-transform";
import type { PhotoMood } from "@/lib/palette";
import type { ParsedActivity } from "@/lib/parse-activity";
import { NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import {
  applyVisibility,
  DEFAULT_VISIBILITY,
  type Visibility,
} from "@/lib/visibility";

type AppState = "empty" | "picking-strava" | "edit" | "download";
const STORAGE_KEY = "effort:ui:v1";

interface PersistedUi {
  accent: string;
  altitudeMood: AltitudeMood;
  athleteName?: string;
  mode: CardMode;
  photoMood: PhotoMood;
  theme: ThemeId;
  visibility: Visibility;
}

function adoptParsed(
  parsed: ParsedActivity,
  persistedAthleteName?: string,
  source: ActivitySource = "upload"
): ActivityData {
  // Parsed files give us universals + whichever sport-specific stats we can
  // compute; merge over a sport-appropriate sample so themes that lean on
  // optional fields (splits, zones, segments) still have something to draw.
  const base = parsed.sport === "run" ? SAMPLE_RUN : SAMPLE_RIDE;
  return {
    ...base,
    ...parsed,
    location: parsed.location || base.location,
    athleteName: parsed.athleteName || persistedAthleteName || base.athleteName,
    splits: parsed.splits ?? base.splits,
    source,
  };
}

function loadPersistedUi(): Partial<PersistedUi> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    // `JSON.parse("null")` returns null and `JSON.parse("42")` returns a
    // number — both would crash the property access on mount. Only accept
    // plain object shapes.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Partial<PersistedUi>;
  } catch {
    return {};
  }
}

export default function Home() {
  const [state, setState] = useState<AppState>("empty");
  const [data, setData] = useState<ActivityData | null>(null);
  const [theme, setTheme] = useState<ThemeId>("path");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // Pan/zoom for the background photo in hero themes. Tied to the current
  // photo, so it resets whenever the photo is swapped or removed.
  const [imageTransform, setImageTransform] =
    useState<ImageTransform>(IDENTITY_TRANSFORM);
  // Rotate / mirror / filter for the photo. Like the transform, tied to the
  // current photo and reset when it's swapped or removed.
  const [photoEffects, setPhotoEffects] = useState<PhotoEffects>(NO_EFFECTS);
  const [accent, setAccent] = useState<string>("#c45a2c");
  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [altitudeMood, setAltitudeMood] = useState<AltitudeMood>("night");
  const [photoMood, setPhotoMood] = useState<PhotoMood>("vibrant");
  const [mode, setMode] = useState<CardMode>("single");
  const carousel = useCarousel();
  // Held outside `data` so it survives between activities and can seed
  // `adoptParsed` when the parsed file lacks an athlete name.
  const persistedAthleteNameRef = useRef<string | undefined>(undefined);

  // One palette extraction for the whole app, regardless of how many copies
  // of the photo theme are mounted (preview + offscreen export mount).
  const photoPalette = useImagePalette(photoUrl, photoMood);

  // Restore UI prefs (theme, accent, visibility, moods, athleteName) on mount.
  // Hydrating from localStorage is a legitimate cold-start sync; the
  // setState-in-effect rule's "fix" (useSyncExternalStore + a custom write
  // path) buys nothing over this small, one-shot read.
  useEffect(() => {
    const persisted = loadPersistedUi();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (persisted.theme) {
      setTheme(persisted.theme);
    }
    if (persisted.accent) {
      setAccent(persisted.accent);
    }
    if (persisted.visibility) {
      setVisibility({ ...DEFAULT_VISIBILITY, ...persisted.visibility });
    }
    if (persisted.altitudeMood) {
      setAltitudeMood(persisted.altitudeMood);
    }
    if (persisted.photoMood) {
      setPhotoMood(persisted.photoMood);
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
    if (typeof window === "undefined") {
      return;
    }
    const payload: PersistedUi = {
      theme,
      accent,
      visibility,
      altitudeMood,
      photoMood,
      mode,
      athleteName: data?.athleteName || persistedAthleteNameRef.current,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable (private mode, quota); soft-fail.
    }
  }, [
    theme,
    accent,
    visibility,
    altitudeMood,
    photoMood,
    mode,
    data?.athleteName,
  ]);

  // Object URLs need cleanup or they leak into memory.
  useEffect(() => {
    if (!photoUrl) {
      return;
    }
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  // After the Strava OAuth round-trip we land on `/?strava=...`. This is a
  // one-shot cold-start read of an external system (URL) — the same
  // pattern as the localStorage hydration above, hence the same disable.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("strava");
    if (!flag) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    switch (flag) {
      case "connected":
        toast.success("Connected to Strava");
        setState((prev) => (prev === "empty" ? "picking-strava" : prev));
        break;
      case "denied":
        toast.error("You declined to connect Strava. You can try again.");
        break;
      case "state_mismatch":
        toast.error("Couldn't verify the Strava sign-in. Please try again.");
        break;
      case "token_exchange":
        toast.error("Strava rejected the sign-in. Try again in a moment.");
        break;
      case "failed":
        toast.error("Couldn't start the Strava sign-in. Try again.");
        break;
      case "bounce_rejected":
        toast.error(
          "The Strava sign-in was redirected to an unrecognised host. Aborted."
        );
        break;
      default:
        toast.error(`Couldn't connect to Strava (${flag})`);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // Strip the param so a reload doesn't re-fire the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("strava");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, []);

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

  const handlePhotoChange = (file: File | null) => {
    setPhotoUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : null;
    });
    // A new (or removed) photo invalidates any previous pan/zoom + effects.
    setImageTransform(IDENTITY_TRANSFORM);
    setPhotoEffects(NO_EFFECTS);
  };

  const handleDownload = () => {
    setState("download");
  };

  const handleKeepEditing = () => {
    setState("edit");
  };

  const handleNew = () => {
    setData(null);
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
    setPhotoUrl(null);
    setImageTransform(IDENTITY_TRANSFORM);
    setPhotoEffects(NO_EFFECTS);
    setState("empty");
  };

  const visibleData = data ? applyVisibility(data, visibility) : data;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header
        date={data?.date}
        status={state === "empty" ? "STEP 01 / 03 · CONNECT" : undefined}
      />
      {state === "empty" ? (
        <EmptyState
          onFilesLoaded={handleFilesLoaded}
          onOpenStravaPicker={handleOpenStravaPicker}
        />
      ) : null}
      {state === "picking-strava" ? (
        <StravaPicker
          onActivityLoaded={handleStravaActivityLoaded}
          onCancel={handleCancelStravaPicker}
          onReauth={handleConnectStrava}
        />
      ) : null}
      {state === "edit" && visibleData && data ? (
        <div className="flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-[1180px] px-6 pt-14 md:px-10 lg:pt-16">
            <ModeToggle mode={mode} onModeChange={setMode} />
          </div>
          {mode === "carousel" ? (
            <CarouselEditState
              accent={accent}
              athleteName={data.athleteName}
              carousel={carousel}
              data={visibleData}
              imageTransform={imageTransform}
              location={data.location}
              onAccentChange={setAccent}
              onAthleteNameChange={handleAthleteNameChange}
              onFilesLoaded={handleFilesLoaded}
              onImageTransformChange={setImageTransform}
              onLocationChange={handleLocationChange}
              onOpenStravaPicker={handleOpenStravaPicker}
              onPhotoChange={handlePhotoChange}
              onPhotoEffectsChange={setPhotoEffects}
              onSportChange={handleSportChange}
              onThemeChange={setTheme}
              onTitleChange={handleTitleChange}
              onVisibilityChange={setVisibility}
              photoEffects={photoEffects}
              photoPaletteTheme={photoPalette.theme}
              photoUrl={photoUrl}
              theme={theme}
              visibility={visibility}
            />
          ) : (
            <EditState
              accent={accent}
              altitudeMood={altitudeMood}
              athleteName={data.athleteName}
              data={visibleData}
              imageTransform={imageTransform}
              location={data.location}
              onAccentChange={setAccent}
              onAltitudeMoodChange={setAltitudeMood}
              onAthleteNameChange={handleAthleteNameChange}
              onDownload={handleDownload}
              onFilesLoaded={handleFilesLoaded}
              onImageTransformChange={setImageTransform}
              onLocationChange={handleLocationChange}
              onOpenStravaPicker={handleOpenStravaPicker}
              onPhotoChange={handlePhotoChange}
              onPhotoMoodChange={setPhotoMood}
              onSportChange={handleSportChange}
              onThemeChange={setTheme}
              onTitleChange={handleTitleChange}
              onVisibilityChange={setVisibility}
              photoMood={photoMood}
              photoPaletteStatus={photoPalette.status}
              photoPaletteTheme={photoPalette.theme}
              photoUrl={photoUrl}
              theme={theme}
              visibility={visibility}
            />
          )}
        </div>
      ) : null}
      {state === "download" && visibleData ? (
        <DownloadState
          altitudeMood={altitudeMood}
          data={visibleData}
          imageTransform={imageTransform}
          onKeepEditing={handleKeepEditing}
          onNew={handleNew}
          photoPaletteTheme={photoPalette.theme}
          photoUrl={photoUrl}
          theme={theme}
        />
      ) : null}
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
