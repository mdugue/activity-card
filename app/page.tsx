"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadState } from "@/components/app/download-state";
import { EditState } from "@/components/app/edit-state";
import { EffortWordmark } from "@/components/app/effort-wordmark";
import { EmptyState } from "@/components/app/empty-state";
import type { ThemeId } from "@/components/app/render-theme";
import {
  type ActivityData,
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import type { AltitudeMood } from "@/components/themes/altitude";
import { useImagePalette } from "@/hooks/use-image-palette";
import { assembleTriathlon } from "@/lib/assemble-triathlon";
import type { PhotoMood } from "@/lib/palette";
import type { ParsedActivity } from "@/lib/parse-activity";
import {
  applyVisibility,
  DEFAULT_VISIBILITY,
  type Visibility,
} from "@/lib/visibility";

type AppState = "empty" | "edit" | "download";
const STORAGE_KEY = "effort:ui:v1";

interface PersistedUi {
  accent: string;
  altitudeMood: AltitudeMood;
  athleteName?: string;
  photoMood: PhotoMood;
  theme: ThemeId;
  visibility: Visibility;
}

function sampleForTheme(theme: ThemeId): ActivityData {
  if (theme === "triathlon") {
    return SAMPLE_TRI;
  }
  if (theme === "photo" || theme === "editorial") {
    return SAMPLE_RUN;
  }
  return SAMPLE_RIDE;
}

function adoptParsed(
  parsed: ParsedActivity,
  persistedAthleteName?: string
): ActivityData {
  // Parsed files give us universals + whichever sport-specific stats we can
  // compute; merge over a sport-appropriate sample so themes that lean on
  // optional fields (splits, zones, segments) still have something to draw.
  const base = parsed.sport === "run" ? SAMPLE_RUN : SAMPLE_RIDE;
  return {
    ...base,
    ...parsed,
    location: parsed.location || base.location,
    athlete_name:
      parsed.athlete_name || persistedAthleteName || base.athlete_name,
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
  const [accent, setAccent] = useState<string>("#c45a2c");
  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [altitudeMood, setAltitudeMood] = useState<AltitudeMood>("night");
  const [photoMood, setPhotoMood] = useState<PhotoMood>("vibrant");
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
      athleteName: data?.athlete_name || persistedAthleteNameRef.current,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable (private mode, quota); soft-fail.
    }
  }, [theme, accent, visibility, altitudeMood, photoMood, data?.athlete_name]);

  // Object URLs need cleanup or they leak into memory.
  useEffect(() => {
    if (!photoUrl) {
      return;
    }
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const handleLoadSample = () => {
    // Pick a sample that matches the persisted theme so the user sees
    // something representative of what they last chose.
    const sample = sampleForTheme(theme);
    const athleteName = persistedAthleteNameRef.current ?? sample.athlete_name;
    setData({ ...sample, athlete_name: athleteName });
    setState("edit");
  };

  const handleFilesLoaded = (parts: ParsedActivity[]) => {
    if (parts.length === 1) {
      setData(adoptParsed(parts[0], persistedAthleteNameRef.current));
    } else {
      const tri = assembleTriathlon(parts);
      // Seed athlete name on assembled triathlons too, since assembleTriathlon
      // pulls from the first parsed file which may be blank.
      setData({
        ...tri,
        athlete_name:
          tri.athlete_name ||
          persistedAthleteNameRef.current ||
          tri.athlete_name,
      });
    }
    setState("edit");
  };

  const handleTitleChange = (title: string) => {
    setData((prev) => (prev ? { ...prev, ride_name: title } : prev));
  };

  const handleAthleteNameChange = (name: string) => {
    persistedAthleteNameRef.current = name;
    setData((prev) => (prev ? { ...prev, athlete_name: name } : prev));
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
    setState("empty");
  };

  const visibleData = data ? applyVisibility(data, visibility) : data;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header date={data?.date} />
      {state === "empty" ? (
        <EmptyState
          onFilesLoaded={handleFilesLoaded}
          onLoadSample={handleLoadSample}
        />
      ) : null}
      {state === "edit" && visibleData && data ? (
        <EditState
          accent={accent}
          altitudeMood={altitudeMood}
          athleteName={data.athlete_name}
          data={visibleData}
          location={data.location}
          onAccentChange={setAccent}
          onAltitudeMoodChange={setAltitudeMood}
          onAthleteNameChange={handleAthleteNameChange}
          onDownload={handleDownload}
          onLocationChange={handleLocationChange}
          onPhotoChange={handlePhotoChange}
          onPhotoMoodChange={setPhotoMood}
          onThemeChange={setTheme}
          onTitleChange={handleTitleChange}
          onVisibilityChange={setVisibility}
          photoMood={photoMood}
          photoPaletteReady={photoPalette.status === "ready"}
          photoPaletteTheme={photoPalette.theme}
          photoUrl={photoUrl}
          theme={theme}
          visibility={visibility}
        />
      ) : null}
      {state === "download" && visibleData ? (
        <DownloadState
          altitudeMood={altitudeMood}
          data={visibleData}
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

function Header({ date }: { date?: string }) {
  return (
    <header className="absolute top-0 right-0 left-0 z-10 flex items-start justify-between px-6 pt-7 md:px-10">
      <EffortWordmark />
      <div className="hidden font-medium font-mono text-[11px] tracking-[0.22em] opacity-55 sm:block">
        ACTIVITY CARD{date ? ` · ${date.toUpperCase()}` : ""}
      </div>
    </header>
  );
}
