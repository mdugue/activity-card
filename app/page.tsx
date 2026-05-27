"use client";

import { useState } from "react";
import { DownloadState } from "./_components/download-state";
import { EditState } from "./_components/edit-state";
import { EffortWordmark } from "./_components/effort-wordmark";
import { EmptyState } from "./_components/empty-state";
import { type ActivityData, SAMPLE_RIDE } from "./_components/sample-data";

type Theme = "path" | "altitude" | "photo" | "data" | "editorial" | "triathlon";
type AppState = "empty" | "edit" | "download";

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
        <EmptyState onLoadSample={handleLoadSample} />
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
      <div
        className="hidden font-mono text-[11px] tracking-[0.22em] opacity-55 sm:block"
        style={{ fontWeight: 500 }}
      >
        ACTIVITY CARD{date ? ` · ${date.toUpperCase()}` : ""}
      </div>
    </header>
  );
}
