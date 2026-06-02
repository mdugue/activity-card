"use client";

import { useEffect, useRef, useState } from "react";
import { StravaConnectButton } from "@/components/app/strava-connect-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStravaConnection } from "@/hooks/use-strava-connection";
import { type ParsedActivity, parseActivityFile } from "@/lib/parse-activity";

const ACTIVITY_FILE_RE = /\.(gpx|fit)$/i;

interface EmptyStateProps {
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onOpenStravaPicker: () => void;
}

export function EmptyState({
  onFilesLoaded,
  onOpenStravaPicker,
}: EmptyStateProps) {
  const strava = useStravaConnection();
  const connectBtnRef = useRef<HTMLAnchorElement>(null);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);
  // `autoFocus` only fires on mount, but neither CTA renders until the
  // connection probe resolves. Focus whichever just became visible so
  // pressing Enter from the landing page triggers the right action.
  useEffect(() => {
    if (strava.loading) {
      return;
    }
    if (strava.connected) {
      pickerBtnRef.current?.focus();
    } else {
      connectBtnRef.current?.focus();
    }
  }, [strava.loading, strava.connected]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-24">
      <div className="font-medium font-mono text-xs tracking-[0.32em] opacity-55">
        STEP 01 / 03
      </div>

      <h1 className="mt-7 text-center font-heading text-7xl uppercase leading-[0.88] tracking-tight sm:text-8xl md:text-[10rem] lg:text-[11rem]">
        BRING YOUR
        <br />
        <span className="text-primary">EFFORT.</span>
      </h1>

      <p className="mt-6 max-w-xl text-center text-base leading-relaxed opacity-65 sm:text-lg">
        Pull your last ride, run, or swim straight from Strava — or drop a{" "}
        <code className="bg-foreground px-2 py-1 font-mono text-background text-sm">
          .gpx
        </code>{" "}
        /{" "}
        <code className="bg-foreground px-2 py-1 font-mono text-background text-sm">
          .fit
        </code>{" "}
        file. We&apos;ll make something worth keeping.
      </p>

      {strava.error === "fetch_failed" ? (
        <Alert
          className="mt-8 max-w-md text-left"
          role="status"
          variant="destructive"
        >
          <AlertTitle>We can&apos;t reach the Effort server.</AlertTitle>
          <AlertDescription>
            Strava sign-in is unavailable right now. Refresh in a moment, or
            drop a file below in the meantime.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-10 min-h-[48px]">
        {!strava.loading && strava.connected ? (
          <Button
            className="h-12 gap-3 px-6 text-base"
            onClick={onOpenStravaPicker}
            ref={pickerBtnRef}
            size="lg"
            variant="outline"
          >
            Pick from Strava
            {strava.athlete?.firstname ? ` · ${strava.athlete.firstname}` : ""}
          </Button>
        ) : null}
        {strava.loading || strava.connected ? null : (
          <StravaConnectButton ref={connectBtnRef} />
        )}
      </div>

      <div className="mt-8 flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] opacity-55">
        <span aria-hidden className="h-px w-10 bg-foreground/30" />
        <span>OR DROP A FILE</span>
        <span aria-hidden className="h-px w-10 bg-foreground/30" />
      </div>

      <DropZone onFilesLoaded={onFilesLoaded} />

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        {(["RIDE", "RUN", "SWIM", "TRIATHLON"] as const).map((s) => (
          <span
            className="border border-foreground px-3 py-1.5 font-medium font-mono text-xs tracking-[0.22em] opacity-80"
            key={s}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function DropZone({
  onFilesLoaded,
}: {
  onFilesLoaded: (parts: ParsedActivity[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) =>
      ACTIVITY_FILE_RE.test(f.name)
    );
    if (!files.length) {
      setError("Drop a .gpx or .fit file.");
      return;
    }
    setError(null);
    setIsParsing(true);
    setProgress(
      files.length === 1 ? "Reading…" : `Reading ${files.length} files…`
    );
    try {
      const parts = await Promise.all(files.map((f) => parseActivityFile(f)));
      onFilesLoaded(parts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setIsParsing(false);
      setProgress(null);
    }
  };

  const idle = !(isParsing || isDragging);

  return (
    // biome-ignore lint/a11y/useSemanticElements: dropzone wraps inner buttons; cannot be a <button> itself
    <div
      aria-label="File drop zone"
      className={
        isDragging
          ? "relative mt-4 flex h-44 w-full max-w-2xl flex-col items-center justify-center border-2 border-primary border-dashed bg-primary/5"
          : "relative mt-4 flex h-44 w-full max-w-2xl flex-col items-center justify-center border border-foreground/30 border-dashed bg-background/30 opacity-90"
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          inputRef.current?.click();
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <input
        accept=".gpx,.fit"
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFiles(e.target.files);
          }
        }}
        ref={inputRef}
        type="file"
      />

      <div className="text-center font-medium font-mono text-xs tracking-[0.22em] opacity-65">
        {progress ?? (idle ? "DROP A FILE OR" : "DROP TO READ")}
      </div>
      <Button
        className="mt-3"
        disabled={isParsing}
        onClick={() => inputRef.current?.click()}
        size="sm"
        variant="outline"
      >
        Browse files
      </Button>
      {error ? (
        <div className="mt-3 font-mono text-destructive text-xs">{error}</div>
      ) : null}
    </div>
  );
}
