"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
    <section className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 pt-20 pb-10 lg:gap-8 lg:pt-24 lg:pb-16">
      <p
        className="w-full max-w-[64rem] text-balance text-left font-medium text-foreground/70 text-lg leading-snug lg:mx-auto lg:text-center lg:text-xl"
        style={claimStyle(intro.stage)}
      >
        {intro.claim}
      </p>

      {/* Claim panels: a swipe rail on touch, a 4-up grid from lg up. The
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
              i === activeSlide ? "w-4 bg-primary" : "w-1.5 bg-foreground/25"
            )}
            key={p.word}
          />
        ))}
      </div>

      {/* Action bar — a single GET STARTED CTA opens the two-step wizard. The
          orange button sits alone on ink so it reads as the focal point. */}
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
          <ArrowRightIcon className="size-5" weight="bold" />
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

      {/* "See it in action" — an inline, looping intro that demonstrates the
          product right after the value prop + CTA. */}
      <IntroVideo />

      {intro.showReplay ? <IntroReplay onReplay={intro.replay} /> : null}

      <OnboardingWizard
        initialStravaPickerOpen={autoStravaPicker}
        onComplete={onComplete}
        onOpenChange={setWizardOpen}
        open={wizardOpen}
      />
    </section>
  );
}
