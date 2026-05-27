"use client";

import { useState } from "react";
import { DownloadState } from "@/components/app/download-state";
import { EditState } from "@/components/app/edit-state";
import { EffortWordmark } from "@/components/app/effort-wordmark";
import { EmptyState } from "@/components/app/empty-state";
import {
  type ActivityData,
  SAMPLE_RIDE,
  SAMPLE_RUN,
} from "@/components/app/sample-data";
import type { ParsedActivity } from "@/lib/parse-activity";

type Theme = "path" | "altitude" | "photo" | "data" | "editorial" | "triathlon";
type AppState = "empty" | "edit" | "download";

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

export default function Home() {
  const [state, setState] = useState<AppState>("empty");
  const [data, setData] = useState<ActivityData | null>(null);
  const [theme, setTheme] = useState<Theme>("path");
  const [photoUrl] = useState<string | null>(null);
  const [accent, setAccent] = useState<string>("#c45a2c");

  const handleLoadSample = () => {
    setData(SAMPLE_RIDE);
    setState("edit");
  };

  const handleFileLoaded = (parsed: ParsedActivity) => {
    setData(adoptParsed(parsed));
    setState("edit");
  };

  const handleDownload = () => {
    setState("download");
  };

  const handleKeepEditing = () => {
    setState("edit");
  };

  const handleNew = () => {
    setData(null);
    setState("empty");
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header date={data?.date} />
      {state === "empty" ? (
        <EmptyState
          onFileLoaded={handleFileLoaded}
          onLoadSample={handleLoadSample}
        />
      ) : null}
      {state === "edit" && data ? (
        <EditState
          accent={accent}
          data={data}
          onAccentChange={setAccent}
          onDownload={handleDownload}
          onThemeChange={setTheme}
          photoUrl={photoUrl}
          theme={theme}
        />
      ) : null}
      {state === "download" && data ? (
        <DownloadState
          data={data}
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
