"use client";

import { ArrowRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";

import { EffortMark, EffortWordmark } from "@/components/app/effort-wordmark";
import { IntroReplay, RevealOverlay } from "@/components/app/empty-state-intro";
import {
  claimMotion,
  PANEL_REST_CLASS,
  panelFadeMotion,
  panelPartMotion,
} from "@/components/app/empty-state-intro-motion";
import type {
  IntroStage,
  IntroVars,
} from "@/components/app/empty-state-intro-motion";
import { IntroVideo } from "@/components/app/intro-video";
import type { OnboardingResult } from "@/components/app/onboarding-wizard";
import { CtaButton } from "@/components/app/primitives/button";
import { StravaCompatLink } from "@/components/app/strava-footer";
import { useEmptyStateIntro } from "@/hooks/use-empty-state-intro";
import { cn } from "@/lib/utils";

// The wizard (and the Strava picker inside it) is a separate chunk: it renders
// nothing until opened, so it stays out of the landing's first load and is
// fetched right after hydration — in cache before anyone reaches the CTA.
const OnboardingWizard = dynamic(
  async () => {
    const m = await import("@/components/app/onboarding-wizard");
    return m.OnboardingWizard;
  },
  { ssr: false }
);

const PANEL_COUNT = 3;
// Keep in sync with the rail's `gap-4` (16px) so the sliced panorama lines up
// across the gutters and reads as one continuous photo.
const PANEL_GAP = "16px";

interface EmptyStateProps {
  /** After the Strava OAuth round-trip the page reloads already connected;
   * this opens the wizard with the Strava picker showing. */
  autoStravaPicker?: boolean;
  onComplete: (result: OnboardingResult) => void;
  /** fired once the user shows intent to make a card (the wizard opens) — the
   *  page warms the editor chunk so it's ready when the wizard completes */
  onIntent?: () => void;
}

/** Abstract route squiggle — the "drop" slide's footer glyph. */
const RouteGlyph = () => (
  <svg
    aria-hidden="true"
    className="text-primary block size-full"
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

/** Abstract elevation profile — the "your" slide's footer glyph. */
const ElevationGlyph = () => (
  <svg
    aria-hidden="true"
    className="text-primary block size-full"
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

// The card claim "DROP YOUR EFFORT" spelled one word per slide, fading back so
// the eye reads left-to-right, with a sample of what each slide becomes
// underneath. Three panels mirror the usual three-slide carousel output.
const PANELS: { glyph: React.ReactNode; word: string; wordClass: string }[] = [
  {
    glyph: (
      <div className="h-16 lg:h-20">
        <RouteGlyph />
      </div>
    ),
    word: "DROP",
    wordClass: "text-[3.5rem] leading-[0.86] text-background lg:text-[4rem]",
  },
  {
    glyph: (
      <div className="h-16 lg:h-20">
        <ElevationGlyph />
      </div>
    ),
    word: "YOUR",
    wordClass: "text-[3.5rem] leading-[0.86] text-background/60 lg:text-[4rem]",
  },
  {
    glyph: (
      <div className="font-heading text-background grid grid-cols-2 gap-x-3 gap-y-1.5 text-xl lg:text-2xl">
        {["82.4KM", "3:14", "1240M", "148"].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
    ),
    word: "EFFORT",
    wordClass: "text-[2.75rem] leading-[0.86] text-primary lg:text-[3.125rem]",
  },
];

/** Where a panel's slice of the shared panorama sits: shifted left by whole
 *  panels (plus gutters), spanning every panel. */
interface SliceVars extends CSSProperties {
  "--panel-count": number;
  "--panel-gap": string;
  "--panel-offset": number;
}

const ClaimPanel = ({
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
}) => {
  const fade = panelFadeMotion(stage, index);
  const parts = {
    content: panelPartMotion(stage, "content", index),
    num: panelPartMotion(stage, "num", index),
    scrim: panelPartMotion(stage, "scrim", index),
    tint: panelPartMotion(stage, "tint", index),
    word: panelPartMotion(stage, "word", index),
  };
  const fadeVars: IntroVars = {
    "--intro-opacity": fade.opacity,
    "--intro-transform": fade.transform,
    "--intro-transition": fade.transition,
  };
  const contentVars: IntroVars = {
    "--intro-opacity": parts.content.opacity,
    "--intro-transform": parts.content.transform,
    "--intro-transition": parts.content.transition,
  };
  const numVars: IntroVars = {
    "--intro-opacity": parts.num.opacity,
    "--intro-transform": parts.num.transform,
    "--intro-transition": parts.num.transition,
  };
  const scrimVars: IntroVars = {
    "--intro-opacity": parts.scrim.opacity,
    "--intro-transform": parts.scrim.transform,
    "--intro-transition": parts.scrim.transition,
  };
  const tintVars: IntroVars = {
    "--intro-opacity": parts.tint.opacity,
    "--intro-transform": parts.tint.transform,
    "--intro-transition": parts.tint.transition,
  };
  const wordVars: IntroVars = {
    "--intro-opacity": parts.word.opacity,
    "--intro-transform": parts.word.transform,
    "--intro-transition": parts.word.transition,
  };
  const sliceVars: SliceVars = {
    "--panel-count": PANEL_COUNT,
    "--panel-gap": PANEL_GAP,
    "--panel-offset": -index,
  };
  return (
    <div
      className={cn(
        "bg-foreground text-background relative flex h-80 w-64 shrink-0 snap-center flex-col overflow-hidden p-5 lg:h-[26rem] lg:w-auto lg:flex-1 lg:basis-0 lg:p-6",
        PANEL_REST_CLASS[index],
        fade.className
      )}
      style={fadeVars}
    >
      {/* One panorama, sliced across all panels — the carousel made literal. */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-[calc(var(--panel-offset)*(100%+var(--panel-gap)))] z-0 w-[calc(var(--panel-count)*100%+(var(--panel-count)-1)*var(--panel-gap))]"
        style={sliceVars}
      >
        <Image
          alt=""
          className="object-cover brightness-80 contrast-105 grayscale-42"
          fill
          priority={index === 0}
          sizes="1024px"
          src="/images/dunes.webp"
        />
      </div>
      <div
        aria-hidden
        className={cn(
          "from-foreground/60 via-foreground/10 to-foreground/90 absolute inset-0 z-10 bg-linear-to-b",
          parts.scrim.className
        )}
        style={scrimVars}
      />
      <div
        aria-hidden
        className={cn(
          "bg-foreground absolute inset-0 z-10 opacity-25 mix-blend-color",
          parts.tint.className
        )}
        style={tintVars}
      />

      <div
        className={cn(
          "text-background/55 tracking-caps-md relative z-20 flex justify-between font-mono text-xs",
          parts.num.className
        )}
        style={numVars}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>/ 0{PANEL_COUNT}</span>
      </div>
      <p
        className={cn(
          "font-heading relative z-20 mt-5 uppercase",
          wordClass,
          parts.word.className
        )}
        style={wordVars}
      >
        {word}
      </p>
      <div
        aria-hidden
        className={cn("relative z-20 mt-auto", parts.content.className)}
        style={contentVars}
      >
        {glyph}
      </div>
    </div>
  );
};

export const EmptyState = ({
  autoStravaPicker = false,
  onComplete,
  onIntent,
}: EmptyStateProps) => {
  const intro = useEmptyStateIntro();
  const claim = claimMotion(intro.stage);
  const claimVars: IntroVars = {
    "--intro-opacity": claim.opacity,
    "--intro-transform": claim.transform,
    "--intro-transition": claim.transition,
  };
  const railRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { replay: handleReplay } = intro;

  // The OAuth round-trip lands back here already connected; open the wizard so
  // its Strava picker (auto-opened via initialStravaPickerOpen) is visible.
  // Adjusted during render when the prop flips on (the page warms the editor
  // chunk itself on that path).
  const [prevAutoStravaPicker, setPrevAutoStravaPicker] = useState(false);
  if (autoStravaPicker !== prevAutoStravaPicker) {
    setPrevAutoStravaPicker(autoStravaPicker);
    if (autoStravaPicker) {
      setWizardOpen(true);
    }
  }

  // Opening the wizard is the user's intent to make a card: tell the page, so
  // it warms the editor chunk while the wizard is up.
  const openWizard = () => {
    setWizardOpen(true);
    onIntent?.();
  };

  const handleWizardOpenChange = (open: boolean) => {
    if (open) {
      openWizard();
    } else {
      setWizardOpen(false);
    }
  };

  // Track the centred slide on the touch rail so the dots reflect the swipe.
  // (No-op on desktop, where the grid doesn't scroll and the dots are hidden.)
  const handleRailScroll = () => {
    const el = railRef.current;
    if (el === null) {
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
    <div className="bg-background text-foreground h-dvh snap-y snap-proximity overflow-y-auto scroll-smooth motion-reduce:snap-none motion-reduce:scroll-auto">
      {/* ───── Section 1 · Hero (light) — the animated claim, panels, CTA ───── */}
      <section className="relative flex min-h-dvh snap-start flex-col px-6 pt-7 pb-10 lg:pt-9">
        <div className="mx-auto flex w-full max-w-[64rem] items-start justify-between">
          <EffortWordmark />
          <p className="tracking-caps-xl font-mono text-xs font-medium opacity-55">
            TURN ANY EFFORT INTO A CARD
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-5 lg:gap-8">
          <h1
            className={cn(
              "text-foreground/70 w-full max-w-[64rem] text-left text-lg leading-snug font-medium text-balance lg:mx-auto lg:text-center lg:text-xl",
              claim.className
            )}
            style={claimVars}
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
                  "transition-size-colors h-1.5 rounded-full",
                  i === activeSlide
                    ? "bg-primary w-4"
                    : "bg-foreground/25 w-1.5"
                )}
                key={p.word}
              />
            ))}
          </div>

          {/* Action bar — a single GET STARTED CTA opens the two-step wizard. */}
          <div className="bg-foreground text-background shadow-foreground/20 flex w-full max-w-[64rem] flex-col gap-4 p-5 shadow-2xl lg:mx-auto lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-7">
            <div className="hidden lg:block">
              <p className="text-background/55 tracking-caps-lg font-mono text-xs font-medium uppercase">
                Ready in two steps
              </p>
              <p className="font-heading mt-1.5 text-3xl leading-none uppercase">
                Make your card
              </p>
            </div>

            <CtaButton onClick={openWizard} scale="hero">
              Get started
              <ArrowRightIcon className="size-5" weight="duotone" />
            </CtaButton>

            <div className="flex items-center justify-between gap-4 lg:ml-auto lg:block lg:text-right">
              <div className="text-background/60 tracking-caps-sm flex items-center gap-2 font-mono text-xs font-medium uppercase lg:justify-end">
                <span className="bg-primary size-1.5" />
                Add activity
              </div>
              <div className="text-background/60 tracking-caps-sm flex items-center gap-2 font-mono text-xs font-medium uppercase lg:mt-2 lg:justify-end">
                <span className="bg-primary size-1.5" />
                Add a photo
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue — invites the user down into the sections below. */}
        <div className="text-foreground/40 pointer-events-none flex flex-col items-center gap-1">
          <span className="caption-micro">Scroll</span>
          <CaretDownIcon
            className="motion-safe:animate-scroll-cue size-4"
            weight="duotone"
          />
        </div>

        {intro.showReplay ? <IntroReplay onReplay={handleReplay} /> : null}
      </section>

      {/* ───── Section 2 · Intro video (dark) ───── */}
      <section className="bg-foreground text-background flex min-h-[92dvh] snap-start items-center px-6 py-20">
        <div className="mx-auto grid w-full max-w-[68rem] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="caption-label">See it in action</p>
            <h2 className="font-heading leading-display-loose mt-4 text-4xl text-balance uppercase lg:text-5xl">
              From activity to art
            </h2>
            <p className="text-background/70 mt-5 max-w-md leading-relaxed">
              Drop a ride, run, or swim, add a favourite photo, and Effort lays
              it out as a share-ready carousel — route, elevation, and the
              numbers that matter. Here’s the gist.
            </p>
            <Link
              className="text-background/60 hover:text-background tracking-caps mt-6 inline-flex items-center gap-2 font-mono text-xs font-medium uppercase transition-colors"
              href="/tutorials"
            >
              Watch the tutorials
              <ArrowRightIcon className="size-3.5" weight="bold" />
            </Link>
          </div>
          <IntroVideo className="ring-background/15 shadow-2xl ring-1 shadow-black/40" />
        </div>
      </section>

      {/* ───── Section 3 · Footer (light) — final CTA + attribution ───── */}
      <footer className="bg-background flex min-h-dvh snap-start flex-col px-6 pt-20 pb-8">
        <div className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col items-center justify-center gap-6 text-center">
          <EffortMark className="size-12 lg:size-14" />
          <h2 className="font-heading leading-display-tight text-5xl text-balance uppercase lg:text-7xl">
            Make your card
          </h2>
          <p className="text-foreground/65 max-w-md leading-relaxed text-balance">
            Every ride, run, and swim deserves a finish worth sharing. Two
            steps, no account needed.
          </p>
          <CtaButton onClick={openWizard} scale="hero">
            Get started
            <ArrowRightIcon className="size-5" weight="duotone" />
          </CtaButton>
        </div>

        <div className="border-foreground/10 mx-auto mt-16 flex w-full max-w-[64rem] flex-col items-center gap-5 border-t pt-8 sm:flex-row sm:justify-between">
          <span className="tracking-caps font-mono text-xs uppercase opacity-80">
            <StravaCompatLink />
          </span>
          <nav className="tracking-caps flex items-center gap-5 font-mono text-xs font-medium uppercase">
            <Link
              className="opacity-60 transition-opacity hover:opacity-100"
              href="/tutorials"
            >
              Tutorials
            </Link>
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
            className="group text-foreground/60 hover:text-foreground tracking-caps font-mono text-xs font-medium uppercase transition-colors"
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
        onOpenChange={handleWizardOpenChange}
        open={wizardOpen}
      />
    </div>
  );
};
