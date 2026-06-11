"use client";

import { ArrowRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EffortMark, EffortWordmark } from "@/components/app/effort-wordmark";
import {
  claimStyle,
  IntroReplay,
  type IntroStage,
  PANEL_REST_CLASS,
  panelFadeStyle,
  panelPartStyle,
  RevealOverlay,
  useEmptyStateIntro,
} from "@/components/app/empty-state-intro";
import { IntroVideo } from "@/components/app/intro-video";
import {
  type OnboardingResult,
  OnboardingWizard,
} from "@/components/app/onboarding-wizard";
import { StravaCompatLink } from "@/components/app/strava-footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PANEL_COUNT = 3;
// Keep in sync with the rail's `gap-4` (16px) so the sliced panorama lines up
// across the gutters and reads as one continuous photo.
const PANEL_GAP = "16px";

interface EmptyStateProps {
  /** After the Strava OAuth round-trip the page reloads already connected;
   * this opens the wizard with the Strava picker showing. */
  autoStravaPicker?: boolean;
  onComplete: (result: OnboardingResult) => void;
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

// The card claim "DROP YOUR EFFORT" spelled one word per slide, fading back so
// the eye reads left-to-right, with a sample of what each slide becomes
// underneath. Three panels mirror the usual three-slide carousel output.
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
    wordClass: "text-[3.5rem] leading-[0.86] text-background/60 lg:text-[4rem]",
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
];

function ClaimPanel({
  glyph,
  index,
  stage,
  word,
  wordClass,
}: {
  glyph: React.ReactNode;
  index: number;
  stage: IntroStage;
  word: string;
  wordClass: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-80 w-64 shrink-0 snap-center flex-col overflow-hidden bg-foreground p-5 text-background lg:h-[26rem] lg:w-auto lg:flex-1 lg:basis-0 lg:p-6",
        PANEL_REST_CLASS[index]
      )}
      style={panelFadeStyle(stage, index)}
    >
      {/* One panorama, sliced across all panels — the carousel made literal. */}
      <div
        aria-hidden
        className="absolute inset-y-0 z-0"
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
        className="absolute inset-0 z-10 bg-linear-to-b from-foreground/60 via-foreground/10 to-foreground/90"
        style={panelPartStyle(stage, "scrim", index)}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-10 bg-foreground opacity-25 mix-blend-color"
        style={panelPartStyle(stage, "tint", index)}
      />

      <div
        className="relative z-20 flex justify-between font-mono text-[11px] text-background/55 tracking-[0.18em]"
        style={panelPartStyle(stage, "num", index)}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>/ 0{PANEL_COUNT}</span>
      </div>
      <p
        className={cn("relative z-20 mt-5 font-heading uppercase", wordClass)}
        style={panelPartStyle(stage, "word", index)}
      >
        {word}
      </p>
      <div
        aria-hidden
        className="relative z-20 mt-auto"
        style={panelPartStyle(stage, "content", index)}
      >
        {glyph}
      </div>
    </div>
  );
}

export function EmptyState({
  autoStravaPicker = false,
  onComplete,
}: EmptyStateProps) {
  const intro = useEmptyStateIntro();
  const railRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);

  // The OAuth round-trip lands back here already connected; open the wizard so
  // its Strava picker (auto-opened via initialStravaPickerOpen) is visible.
  useEffect(() => {
    if (autoStravaPicker) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWizardOpen(true);
    }
  }, [autoStravaPicker]);

  // Track the centred slide on the touch rail so the dots reflect the swipe.
  // (No-op on desktop, where the grid doesn't scroll and the dots are hidden.)
  const handleRailScroll = () => {
    const el = railRef.current;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    const index =
      max > 0 ? Math.round((el.scrollLeft / max) * (PANELS.length - 1)) : 0;
    setActiveSlide(index);
  };

  return (
    // A dedicated scroll-snap container (scoped here, so snapping never leaks
    // into the editor/download views). `proximity` keeps it gentle — tall
    // content never traps the user — and reduced motion drops snap + smoothing.
    <div className="h-dvh snap-y snap-proximity overflow-y-auto scroll-smooth bg-background text-foreground motion-reduce:snap-none motion-reduce:scroll-auto">
      {/* ───── Section 1 · Hero (light) — the animated claim, panels, CTA ───── */}
      <section className="relative flex min-h-dvh snap-start flex-col px-6 pt-7 pb-10 lg:pt-9">
        <div className="mx-auto flex w-full max-w-[64rem] items-start justify-between">
          <EffortWordmark />
          <p className="font-medium font-mono text-[10px] tracking-[0.22em] opacity-55 sm:text-[11px]">
            TURN ANY EFFORT INTO A CARD
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-5 lg:gap-8">
          <h1
            className="w-full max-w-[64rem] text-balance text-left font-medium text-foreground/70 text-lg leading-snug lg:mx-auto lg:text-center lg:text-xl"
            style={claimStyle(intro.stage)}
          >
            {intro.claim}
          </h1>

          {/* Claim panels: a swipe rail on touch, a 3-up grid from lg up. The
              intro animation slices a seamless photo overlay into these slides. */}
          <div className="relative w-full max-w-[64rem] lg:mx-auto">
            <div
              className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto lg:snap-none lg:overflow-x-visible"
              onScroll={handleRailScroll}
              ref={railRef}
            >
              {PANELS.map((p, i) => (
                <ClaimPanel
                  glyph={p.glyph}
                  index={i}
                  key={p.word}
                  stage={intro.stage}
                  word={p.word}
                  wordClass={p.wordClass}
                />
              ))}
            </div>
            <RevealOverlay photoSrc="/images/dunes.webp" stage={intro.stage} />
          </div>

          {/* Swipe affordance — touch only; tracks the centred slide. */}
          <div className="flex gap-1.5 lg:hidden">
            {PANELS.map((p, i) => (
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === activeSlide
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-foreground/25"
                )}
                key={p.word}
              />
            ))}
          </div>

          {/* Action bar — a single GET STARTED CTA opens the two-step wizard. */}
          <div className="flex w-full max-w-[64rem] flex-col gap-4 bg-foreground p-5 text-background shadow-2xl shadow-foreground/20 lg:mx-auto lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-7">
            <div className="hidden lg:block">
              <p className="font-medium font-mono text-[11px] text-background/55 uppercase tracking-[0.2em]">
                Ready in two steps
              </p>
              <p className="mt-1.5 font-heading text-3xl uppercase leading-none">
                Make your card
              </p>
            </div>

            <Button
              className="h-auto justify-center px-8 py-4 font-heading text-2xl uppercase tracking-wide shadow-primary/50 shadow-xl hover:-translate-y-0.5"
              onClick={() => setWizardOpen(true)}
              size="lg"
            >
              Get started
              <ArrowRightIcon className="size-5" weight="duotone" />
            </Button>

            <div className="flex items-center justify-between gap-4 lg:ml-auto lg:block lg:text-right">
              <div className="flex items-center gap-2 font-medium font-mono text-[11px] text-background/60 uppercase tracking-[0.14em] lg:justify-end">
                <span className="size-1.5 bg-primary" />
                Add activity
              </div>
              <div className="flex items-center gap-2 font-medium font-mono text-[11px] text-background/60 uppercase tracking-[0.14em] lg:mt-2 lg:justify-end">
                <span className="size-1.5 bg-primary" />
                Add a photo
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue — invites the user down into the sections below. */}
        <div className="pointer-events-none flex flex-col items-center gap-1 text-foreground/40">
          <span className="caption-micro">Scroll</span>
          <CaretDownIcon
            className="size-4 motion-safe:animate-bounce"
            weight="duotone"
          />
        </div>

        {intro.showReplay ? <IntroReplay onReplay={intro.replay} /> : null}
      </section>

      {/* ───── Section 2 · Intro video (dark) ───── */}
      <section className="flex min-h-[92dvh] snap-start items-center bg-foreground px-6 py-20 text-background">
        <div className="mx-auto grid w-full max-w-[68rem] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="caption-label">See it in action</p>
            <h2 className="mt-4 text-balance font-heading text-4xl uppercase leading-[0.95] lg:text-5xl">
              From activity to art
            </h2>
            <p className="mt-5 max-w-md text-background/70 leading-relaxed">
              Drop a ride, run, or swim, add a favourite photo, and Effort lays
              it out as a share-ready carousel — route, elevation, and the
              numbers that matter. Here’s the gist.
            </p>
            <p className="mt-6 font-medium font-mono text-[11px] text-background/45 uppercase tracking-[0.16em]">
              Short placeholder — full walkthrough on the way
            </p>
          </div>
          <IntroVideo className="shadow-2xl shadow-black/40 ring-1 ring-background/15" />
        </div>
      </section>

      {/* ───── Section 3 · Footer (light) — final CTA + attribution ───── */}
      <footer className="flex min-h-dvh snap-start flex-col bg-background px-6 pt-20 pb-8">
        <div className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col items-center justify-center gap-6 text-center">
          <EffortMark className="size-12 lg:size-14" />
          <h2 className="text-balance font-heading text-5xl uppercase leading-[0.9] lg:text-7xl">
            Make your card
          </h2>
          <p className="max-w-md text-balance text-foreground/65 leading-relaxed">
            Every ride, run, and swim deserves a finish worth sharing. Two
            steps, no account needed.
          </p>
          <Button
            className="h-auto justify-center px-8 py-4 font-heading text-2xl uppercase tracking-wide shadow-primary/50 shadow-xl hover:-translate-y-0.5"
            onClick={() => setWizardOpen(true)}
            size="lg"
          >
            Get started
            <ArrowRightIcon className="size-5" weight="duotone" />
          </Button>
        </div>

        <div className="mx-auto mt-16 flex w-full max-w-[64rem] flex-col items-center gap-5 border-foreground/10 border-t pt-8 sm:flex-row sm:justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] opacity-80">
            <StravaCompatLink />
          </span>
          <nav className="flex items-center gap-5 font-medium font-mono text-[11px] uppercase tracking-[0.16em]">
            <Link
              className="opacity-60 transition-opacity hover:opacity-100"
              href="/imprint"
            >
              Imprint
            </Link>
            <Link
              className="opacity-60 transition-opacity hover:opacity-100"
              href="/privacy"
            >
              Privacy
            </Link>
          </nav>
          <a
            className="group font-medium font-mono text-[11px] text-foreground/60 uppercase tracking-[0.16em] transition-colors hover:text-foreground"
            href="https://manuel.fyi/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Made between training sessions by{" "}
            <span className="text-primary group-hover:underline">Manuel ↗</span>
          </a>
        </div>
      </footer>

      <OnboardingWizard
        initialStravaPickerOpen={autoStravaPicker}
        onComplete={onComplete}
        onOpenChange={setWizardOpen}
        open={wizardOpen}
      />
    </div>
  );
}
