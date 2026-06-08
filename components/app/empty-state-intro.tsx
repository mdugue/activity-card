"use client";

// Intro animation for the connect empty state (desktop only). Narrates the
// product mechanic in three beats — one photo → sliced into slides → overlaid
// with data — then rests on the tagline. See the design handoff README.
//
// Design contract (important): the *composed* (finished) state is the base.
// "Hidden" values are only ever applied via JS after mount, so no-JS, SSR,
// reduced-motion and mobile all render the finished layout directly. The
// animation is layered on top via CSS transitions driven by a single stage
// flip, with per-element delays reproducing the handoff timeline.

import Image from "next/image";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

export type IntroStage = "composed" | "hidden" | "playing";
type IntroRole = "scrim" | "tint" | "num" | "word" | "content";
type Beat = "whole" | "cut" | "reveal" | "done";

const RISE_PX = 14;
const CUT_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const RISE_EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
// Timeline constants (seconds), mirrored from the handoff spec.
const CUT_START = 0.45;
const CUT_STAGGER = 0.18;
const FILL_START = 1.15;
const FILL_STAGGER = 0.16;
// Right after the slices are cut, the trailing ones recede — softly and slowly,
// overlapping the data fill — so the eye stays on slide one. Resting opacity
// drops the farther a panel sits from the first. The delay clears the photo
// handoff (~1.4s) so the seam stays clean. Desktop only; the mobile rail keeps
// every slide at full strength.
const FADE_DELAY = 1.25;
const FADE_DURATION = 1.5;
const PANEL_REST_OPACITY = [1, 0.8, 0.65, 0.5];
// Tailwind counterparts of PANEL_REST_OPACITY — keep the two in lockstep. These
// are the composed (no-JS / reduced-motion) resting values, lg-gated.
export const PANEL_REST_CLASS = [
  "",
  "lg:opacity-80",
  "lg:opacity-65",
  "lg:opacity-50",
];

const EYEBROW: Record<Beat, string> = {
  whole: "One photo — your activity",
  cut: "Sliced into story slides",
  reveal: "Overlaid with your data",
  done: "Your claim, told across the slides — two steps to fill them",
};

// Only narrate where the 4-up grid actually exists and motion is welcome.
function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return window.innerWidth >= 1024;
}

// useLayoutEffect on the client (sets the hidden state before paint), a no-op
// on the server — avoids React's SSR warning without losing the pre-paint set.
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useEmptyStateIntro() {
  const [stage, setStage] = useState<IntroStage>("composed");
  const [beat, setBeat] = useState<Beat>("done");
  const [showReplay, setShowReplay] = useState(false);
  const [runId, setRunId] = useState(0);

  // Re-runs whenever `runId` is bumped (initial mount + each Replay). Sets the
  // hidden start state before paint, then a double rAF flips to "playing" once
  // that frame is committed so the CSS transitions actually fire.
  useIsoLayoutEffect(() => {
    if (!shouldPlayIntro()) {
      return;
    }
    setStage("hidden");
    setBeat("whole");
    setShowReplay(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setStage("playing"));
    });
    const timers = [
      window.setTimeout(() => setBeat("cut"), 450),
      window.setTimeout(() => setBeat("reveal"), 1100),
      window.setTimeout(() => setBeat("done"), 2450),
      window.setTimeout(() => setShowReplay(true), 2550),
      // Lock the composed end-state in case a background tab froze the
      // transition clock mid-flight (after the slow recede has settled).
      window.setTimeout(() => setStage("composed"), 3000),
    ];
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      for (const t of timers) {
        window.clearTimeout(t);
      }
    };
  }, [runId]);

  const replay = useCallback(() => setRunId((r) => r + 1), []);
  return { stage, eyebrow: EYEBROW[beat], showReplay, replay };
}

// Per-element style for the panel overlays (scrim/tint/number/word/graphic).
// `composed` returns nothing so the element keeps its Tailwind resting look.
const ROLE: Record<
  IntroRole,
  { dur: number; ease: string; offset: number; opacity: number; rises: boolean }
> = {
  scrim: { opacity: 1, rises: false, dur: 0.5, offset: 0, ease: "ease-out" },
  tint: { opacity: 0.25, rises: false, dur: 0.5, offset: 0, ease: "ease-out" },
  num: { opacity: 1, rises: true, dur: 0.5, offset: 0.05, ease: "ease-out" },
  word: { opacity: 1, rises: true, dur: 0.55, offset: 0.09, ease: RISE_EASE },
  content: {
    opacity: 1,
    rises: true,
    dur: 0.55,
    offset: 0.13,
    ease: "ease-out",
  },
};

export function panelPartStyle(
  stage: IntroStage,
  role: IntroRole,
  panelIndex: number
): CSSProperties | undefined {
  if (stage === "composed") {
    return;
  }
  const r = ROLE[role];
  if (stage === "hidden") {
    return {
      opacity: 0,
      transform: r.rises ? `translateY(${RISE_PX}px)` : undefined,
      transition: "none",
    };
  }
  const delay = FILL_START + panelIndex * FILL_STAGGER + r.offset;
  const transition = r.rises
    ? `opacity ${r.dur}s ${r.ease} ${delay}s, transform ${r.dur}s ${r.ease} ${delay}s`
    : `opacity ${r.dur}s ${r.ease} ${delay}s`;
  return {
    opacity: r.opacity,
    transform: r.rises ? "translateY(0)" : undefined,
    transition,
  };
}

// Whole-panel recede applied to each panel root. Holds full opacity through the
// fill (the delay) so the photo handoff stays seamless, then eases down to the
// resting value. `composed` defers to the Tailwind PANEL_REST_CLASS.
export function panelFadeStyle(
  stage: IntroStage,
  panelIndex: number
): CSSProperties | undefined {
  const rest = PANEL_REST_OPACITY[panelIndex];
  if (stage === "composed" || rest === 1) {
    return;
  }
  if (stage === "hidden") {
    return { opacity: 1, transition: "none" };
  }
  return {
    opacity: rest,
    transition: `opacity ${FADE_DURATION}s ease-in-out ${FADE_DELAY}s`,
  };
}

// Gutter bars align to the fluid panel seams: panel width is (100% − 3·16px)/4,
// so seam j sits j+1 panels plus j gaps in from the left.
const GUTTER_LEFT = [
  "calc((100% - 48px) / 4)",
  "calc((100% - 48px) / 2 + 16px)",
  "calc(3 * (100% - 48px) / 4 + 32px)",
];

function revealStyle(stage: IntroStage): CSSProperties {
  if (stage === "hidden") {
    return { opacity: 1, transition: "none" };
  }
  if (stage === "playing") {
    return {
      opacity: 0,
      transition: `opacity 0.42s ease-in-out ${CUT_START + 3 * CUT_STAGGER}s`,
    };
  }
  return { opacity: 0 };
}

function gutterStyle(stage: IntroStage, i: number): CSSProperties {
  if (stage === "hidden") {
    return { transform: "scaleY(0)", transition: "none" };
  }
  if (stage === "playing") {
    return {
      transform: "scaleY(1)",
      transition: `transform 0.42s ${CUT_EASE} ${CUT_START + i * CUT_STAGGER}s`,
    };
  }
  return { transform: "scaleY(1)" };
}

/**
 * The seamless "whole photo" overlay + guillotine gutters that sit above the
 * panel strip during the intro. Desktop only; invisible (opacity 0) at rest.
 * Uses the same source/fit/filter as the panel slices so the handoff is
 * pixel-identical.
 */
export function RevealOverlay({
  photoSrc,
  stage,
}: {
  photoSrc: string;
  stage: IntroStage;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 hidden overflow-hidden lg:block"
      style={revealStyle(stage)}
    >
      <Image
        alt=""
        className="object-cover brightness-[0.8] contrast-[1.05] grayscale-[0.42]"
        fill
        sizes="1024px"
        src={photoSrc}
      />
      {GUTTER_LEFT.map((left, i) => (
        <div
          className="absolute inset-y-0 w-4 origin-top bg-background"
          key={left}
          style={{ left, ...gutterStyle(stage, i) }}
        />
      ))}
    </div>
  );
}

export function IntroReplay({ onReplay }: { onReplay: () => void }) {
  return (
    <button
      className="absolute right-5 bottom-4 z-40 hidden items-center gap-2 rounded-full border border-foreground/30 px-3 py-2 font-medium font-mono text-[11px] uppercase tracking-[0.16em] opacity-60 transition-opacity hover:opacity-100 lg:inline-flex"
      onClick={onReplay}
      type="button"
    >
      <span aria-hidden="true">↻</span> Replay
    </button>
  );
}
