"use client";

import { useEffect, useState } from "react";
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
import { assembleTriathlon } from "@/lib/assemble-triathlon";
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

function adoptParsed(parsed: ParsedActivity): ActivityData {
  // Parsed files give us universals + whichever sport-specific stats we can
  // compute; merge over a sport-appropriate sample so themes that lean on
  // optional fields (splits, zones, segments) still have something to draw.
  const base = parsed.sport === "run" ? SAMPLE_RUN : SAMPLE_RIDE;
  return {
    ...base,
    ...parsed,
    location: parsed.location || base.location,
    athlete_name: parsed.athlete_name || base.athlete_name,
  };
}

function loadPersistedUi(): Partial<PersistedUi> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
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

  // Restore UI prefs (theme, accent, visibility) on mount.
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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist on change.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload: PersistedUi = { theme, accent, visibility };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable (private mode, quota); soft-fail.
    }
  }, [theme, accent, visibility]);

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
    setData(sampleForTheme(theme));
    setState("edit");
  };

  const handleFilesLoaded = (parts: ParsedActivity[]) => {
    if (parts.length === 1) {
      setData(adoptParsed(parts[0]));
    } else {
      setData(assembleTriathlon(parts));
    }
    setState("edit");
  };

  const handleTitleChange = (title: string) => {
    setData((prev) => (prev ? { ...prev, ride_name: title } : prev));
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
      {state === "edit" && visibleData ? (
        <EditState
          accent={accent}
          data={visibleData}
          onAccentChange={setAccent}
          onDownload={handleDownload}
          onPhotoChange={handlePhotoChange}
          onThemeChange={setTheme}
          onTitleChange={handleTitleChange}
          onVisibilityChange={setVisibility}
          photoUrl={photoUrl}
          theme={theme}
          visibility={visibility}
        />
      ) : null}
      {state === "download" && visibleData ? (
        <DownloadState
          data={visibleData}
          onKeepEditing={handleKeepEditing}
          onNew={handleNew}
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
