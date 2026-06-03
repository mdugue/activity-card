"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EffortMark } from "@/components/app/effort-wordmark";
import { StravaConnectButton } from "@/components/app/strava-connect-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useStravaConnection } from "@/hooks/use-strava-connection";
import { type ParsedActivity, parseActivityFile } from "@/lib/parse-activity";
import { cn } from "@/lib/utils";

const ACTIVITY_FILE_RE = /\.(gpx|fit)$/i;
const PANEL_COUNT = 4;
// Keep in sync with the rail's `gap-4` (16px) so the sliced panorama lines up
// across the gutters and reads as one continuous photo.
const PANEL_GAP = "16px";

interface EmptyStateProps {
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onOpenStravaPicker: () => void;
}

/** Abstract route squiggle — the "drop" slide's footer glyph. */
function RouteGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="block size-full text-primary"
      preserveAspectRatio="none"
      viewBox="0 0 100 70"
    >
      <title>Route</title>
      <path
        d="M6 56 C18 26 30 64 41 42 S62 20 72 48 S90 26 95 38"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.4"
      />
      <circle className="fill-background" cx="6" cy="56" r="3.6" />
      <rect fill="currentColor" height="6" width="6" x="92" y="35" />
    </svg>
  );
}

/** Abstract elevation profile — the "your" slide's footer glyph. */
function ElevationGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="block size-full text-primary"
      preserveAspectRatio="none"
      viewBox="0 0 100 56"
    >
      <title>Elevation</title>
      <polygon
        className="opacity-90"
        fill="currentColor"
        points="0,56 0,42 13,38 27,28 39,33 52,16 65,23 78,9 90,17 100,12 100,56"
      />
    </svg>
  );
}

// The claim "DROP YOUR EFFORT." spelled one word per slide, fading back so the
// eye reads left-to-right, with a sample of what each slide becomes underneath.
const PANELS: { glyph: React.ReactNode; word: string; wordClass: string }[] = [
  {
    word: "DROP",
    wordClass: "text-[3.5rem] leading-[0.86] text-background lg:text-[4rem]",
    glyph: (
      <div className="h-16 lg:h-20">
        <RouteGlyph />
      </div>
    ),
  },
  {
    word: "YOUR",
    wordClass: "text-[3.5rem] leading-[0.86] text-background/55 lg:text-[4rem]",
    glyph: (
      <div className="h-16 lg:h-20">
        <ElevationGlyph />
      </div>
    ),
  },
  {
    word: "EFFORT",
    wordClass: "text-[2.75rem] leading-[0.86] text-primary lg:text-[3.125rem]",
    glyph: (
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-heading text-background text-xl lg:text-2xl">
        {["82.4KM", "3:14", "1240M", "148"].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
    ),
  },
  {
    word: ".",
    wordClass: "text-[6.75rem] leading-none text-background/25 lg:text-[8rem]",
    glyph: (
      <div className="flex justify-center">
        <EffortMark className="size-12 lg:size-16" />
      </div>
    ),
  },
];

function ClaimPanel({
  glyph,
  index,
  word,
  wordClass,
}: {
  glyph: React.ReactNode;
  index: number;
  word: string;
  wordClass: string;
}) {
  return (
    <div className="relative flex h-[20rem] w-60 shrink-0 snap-center flex-col overflow-hidden bg-foreground p-5 text-background lg:h-[31rem] lg:w-auto lg:flex-1 lg:basis-0 lg:p-6">
      {/* One panorama, sliced across all panels — the carousel made literal. */}
      <div
        aria-hidden
        className="absolute inset-y-0"
        style={{
          width: `calc(${PANEL_COUNT} * 100% + ${PANEL_COUNT - 1} * ${PANEL_GAP})`,
          left: `calc(${-index} * (100% + ${PANEL_GAP}))`,
        }}
      >
        <Image
          alt=""
          className="object-cover brightness-[0.8] contrast-[1.05] grayscale-[0.42]"
          fill
          priority={index === 0}
          sizes="1024px"
          src="/images/dunes.webp"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-foreground/60 via-foreground/10 to-foreground/90"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-foreground opacity-25 mix-blend-color"
      />

      <div className="relative z-10 flex justify-between font-mono text-[11px] text-background/55 tracking-[0.18em]">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>/ 0{PANEL_COUNT}</span>
      </div>
      <p className={cn("relative z-10 mt-5 font-heading uppercase", wordClass)}>
        {word}
      </p>
      <div aria-hidden className="relative z-10 mt-auto">
        {glyph}
      </div>
    </div>
  );
}

export function EmptyState({
  onFilesLoaded,
  onOpenStravaPicker,
}: EmptyStateProps) {
  const strava = useStravaConnection();
  const inputRef = useRef<HTMLInputElement>(null);
  const connectBtnRef = useRef<HTMLAnchorElement>(null);
  const pickBtnRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Focus whichever CTA just resolved so the landing is keyboard-ready and
  // Enter triggers the right action. Both render only once the probe settles.
  useEffect(() => {
    if (strava.loading) {
      return;
    }
    if (strava.connected) {
      pickBtnRef.current?.focus();
    } else {
      connectBtnRef.current?.focus();
    }
  }, [strava.loading, strava.connected]);

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) =>
      ACTIVITY_FILE_RE.test(f.name)
    );
    if (!files.length) {
      toast.error("Drop a .gpx or .fit file.");
      return;
    }
    setIsParsing(true);
    try {
      const parts = await Promise.all(files.map((f) => parseActivityFile(f)));
      onFilesLoaded(parts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setIsParsing(false);
    }
  };

  const openFilePicker = () => inputRef.current?.click();

  const showOverlay = isDragging || isParsing;
  const hasError = strava.error === "fetch_failed";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-drop augments the explicit "drop a file" control; not the only path
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: drag-drop augments the explicit "drop a file" control; not the only path
    <section
      className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 pt-20 pb-10 lg:gap-8 lg:pt-24 lg:pb-16"
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

      {showOverlay ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 border-2 border-primary border-dashed px-12 py-10">
            {isParsing ? <Spinner className="size-6 text-primary" /> : null}
            <span className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.28em]">
              {isParsing ? "Reading…" : "Drop to read"}
            </span>
          </div>
        </div>
      ) : null}

      <p className="caption-label w-full text-left lg:text-center">
        Your claim, told across the slides — connect to fill them
      </p>

      {/* Claim panels: a swipe rail on touch, a 4-up grid from lg up. */}
      <div className="no-scrollbar flex w-full max-w-[64rem] snap-x snap-mandatory gap-4 overflow-x-auto lg:mx-auto lg:snap-none lg:overflow-x-visible">
        {PANELS.map((p, i) => (
          <ClaimPanel
            glyph={p.glyph}
            index={i}
            key={p.word}
            word={p.word}
            wordClass={p.wordClass}
          />
        ))}
      </div>

      {/* Swipe affordance — touch only. */}
      <div className="flex gap-1.5 lg:hidden">
        {PANELS.map((p, i) => (
          <span
            className={cn(
              "h-1.5 rounded-full",
              i === 0 ? "w-4 bg-primary" : "w-1.5 bg-foreground/25"
            )}
            key={p.word}
          />
        ))}
      </div>

      {hasError ? (
        <Alert
          className="w-full max-w-md text-left"
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

      {/* Action tier — the orange button sits alone on ink so it reads as the
          focal point instead of clashing with the rust accent. */}
      <div className="flex w-full max-w-[64rem] flex-col gap-4 bg-foreground p-5 text-background shadow-2xl shadow-foreground/20 lg:mx-auto lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-7">
        <div className="hidden lg:block">
          <p className="font-mono text-[11px] text-background/55 uppercase tracking-[0.2em]">
            Step 01 — Connect
          </p>
          <p className="mt-1.5 font-heading text-3xl uppercase leading-none">
            Fill the slides
          </p>
        </div>

        <div className="flex justify-center lg:block">
          {strava.loading ? (
            <div className="flex h-12 w-[237px] items-center justify-center">
              <Spinner className="text-background/50" />
            </div>
          ) : null}
          {strava.connected && !strava.loading ? (
            <Button
              className="h-12 w-full justify-center px-8 lg:w-auto"
              onClick={onOpenStravaPicker}
              ref={pickBtnRef}
              size="lg"
            >
              Pick from Strava
              {strava.athlete?.firstname
                ? ` · ${strava.athlete.firstname}`
                : ""}
            </Button>
          ) : null}
          {strava.loading || strava.connected ? null : (
            <StravaConnectButton
              className="shadow-primary/50 shadow-xl transition-transform hover:-translate-y-0.5"
              ref={connectBtnRef}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 lg:ml-auto lg:block lg:text-right">
          <p className="font-mono text-[11px] text-background/55 uppercase tracking-[0.2em]">
            OAuth · Read-only · Revoke anytime
          </p>
          <p className="text-background/65 text-sm lg:mt-2">
            or{" "}
            <button
              className="underline underline-offset-4 hover:text-background"
              onClick={openFilePicker}
              type="button"
            >
              drop a .gpx / .fit
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
