"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStravaConnection } from "@/hooks/use-strava-connection";
import { type ParsedActivity, parseActivityFile } from "@/lib/parse-activity";

const ACTIVITY_FILE_RE = /\.(gpx|fit)$/i;

interface EmptyStateProps {
  onConnectStrava: () => void;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onLoadSample: () => void;
  onOpenStravaPicker: () => void;
}

export function EmptyState({
  onLoadSample,
  onFilesLoaded,
  onConnectStrava,
  onOpenStravaPicker,
}: EmptyStateProps) {
  const strava = useStravaConnection();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-24">
      <div className="font-medium font-mono text-xs tracking-[0.32em] opacity-55">
        STEP 01 / 03
      </div>

      <h1 className="mt-7 text-center font-heading text-7xl uppercase leading-[0.88] tracking-tight sm:text-8xl md:text-[10rem] lg:text-[11rem]">
        DROP YOUR
        <br />
        <span className="text-primary">EFFORT.</span>
      </h1>

      <p className="mt-6 max-w-xl text-center text-base leading-relaxed opacity-65 sm:text-lg">
        One{" "}
        <code className="bg-foreground px-2 py-1 font-mono text-background text-sm">
          .gpx
        </code>{" "}
        or{" "}
        <code className="bg-foreground px-2 py-1 font-mono text-background text-sm">
          .fit
        </code>
        , or drop two-plus together for a triathlon / brick. We&apos;ll make
        something worth keeping.
      </p>

      <DropZone onFilesLoaded={onFilesLoaded} onLoadSample={onLoadSample} />

      <div className="mt-6 flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] opacity-55">
        <span aria-hidden className="h-px w-10 bg-foreground/30" />
        <span>OR</span>
        <span aria-hidden className="h-px w-10 bg-foreground/30" />
      </div>

      <Button
        className="mt-4 gap-2"
        disabled={strava.loading}
        onClick={strava.connected ? onOpenStravaPicker : onConnectStrava}
        size="lg"
        variant="outline"
      >
        <StravaIcon />
        {strava.connected
          ? `Pick from Strava${strava.athlete?.firstname ? ` · ${strava.athlete.firstname}` : ""}`
          : "Connect Strava"}
      </Button>

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

function StravaIcon() {
  return (
    <svg
      aria-hidden
      fill="#FC4C02"
      height="18"
      viewBox="0 0 24 24"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Strava</title>
      <path d="M12 0 L20 16 L14.4 16 L12 11.2 L9.6 16 L4 16 Z" />
      <path d="M14 16 L18 16 L16 20 Z" />
      <path d="M16 20 L20 20 L18 24 Z" />
    </svg>
  );
}

function DropZone({
  onLoadSample,
  onFilesLoaded,
}: {
  onLoadSample: () => void;
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
          ? "relative mt-12 flex h-72 w-full max-w-2xl flex-col items-center justify-center border-2 border-primary border-dashed bg-primary/5"
          : "relative mt-12 flex h-72 w-full max-w-2xl flex-col items-center justify-center border-2 border-foreground border-dashed bg-background/45"
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
      {/* corner brackets */}
      <div className="absolute -top-1 -left-1 size-5 bg-primary" />
      <div className="absolute -top-1 -right-1 size-5 bg-primary" />
      <div className="absolute -bottom-1 -left-1 size-5 bg-primary" />
      <div className="absolute -right-1 -bottom-1 size-5 bg-primary" />

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

      <svg
        aria-hidden
        className="mb-4"
        fill="none"
        height="64"
        viewBox="0 0 64 64"
        width="64"
      >
        <title>route mark</title>
        <path
          d="M14 44 Q24 18, 32 32 T54 22"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={3}
        />
        <circle
          className="text-primary"
          cx={14}
          cy={44}
          fill="currentColor"
          r={4}
        />
        <circle cx={54} cy={22} fill="currentColor" r={4} />
      </svg>

      <div className="text-center font-heading text-4xl uppercase leading-none tracking-tight sm:text-5xl">
        {progress ?? (idle ? "DROP A FILE HERE" : "DROP TO READ")}
      </div>
      <div className="mt-3 font-medium font-mono text-xs tracking-[0.16em] opacity-55">
        {idle ? "ONE FILE OR MANY · OR" : ""}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          disabled={isParsing}
          onClick={() => inputRef.current?.click()}
          size="lg"
        >
          Browse files
        </Button>
        <Button
          disabled={isParsing}
          onClick={onLoadSample}
          size="lg"
          variant="outline"
        >
          Try a sample
        </Button>
      </div>
      {error ? (
        <div className="mt-4 font-mono text-destructive text-xs">{error}</div>
      ) : null}
    </div>
  );
}
