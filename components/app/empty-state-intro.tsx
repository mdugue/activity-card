"use client";

// The overlay pieces of the connect empty state's intro animation (desktop
// only): the seamless photo + guillotine gutters that slice into the claim
// panels, and the Replay control. Timeline + per-element styles live in
// `empty-state-intro-motion.ts`; the stage machine in
// `hooks/use-empty-state-intro.ts`.

import Image from "next/image";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

import type { IntroStage } from "./empty-state-intro-motion";

const CUT_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
// Timeline constants (seconds).
const CUT_START = 0.45;
const CUT_STAGGER = 0.18;

// Gutter bars align to the fluid panel seams: panel width is (100% − 2·16px)/3,
// so seam j sits j+1 panels plus j gaps in from the left.
const GUTTER_LEFT = [
  "calc((100% - 32px) / 3)",
  "calc(2 * (100% - 32px) / 3 + 16px)",
];

/** The overlay's reveal timing, as CSS custom properties. */
interface RevealStyle extends CSSProperties {
  "--cut-ease": string;
  "--reveal-delay": string;
  "--reveal-ease": string;
}

/** One gutter's seam position and cut delay. */
interface GutterStyle extends CSSProperties {
  "--cut-delay": string;
  "--gutter-left": string;
}

// The photo fades once every gutter has cut.
const REVEAL_STYLE: RevealStyle = {
  "--cut-ease": CUT_EASE,
  "--reveal-delay": `${CUT_START + GUTTER_LEFT.length * CUT_STAGGER}s`,
  "--reveal-ease": "ease-in-out",
};

/**
 * The seamless "whole photo" overlay + guillotine gutters that sit above the
 * panel strip during the intro. Desktop only; invisible (opacity 0) at rest.
 * Uses the same source/fit/filter as the panel slices so the handoff is
 * pixel-identical.
 */
export const RevealOverlay = ({
  photoSrc,
  stage,
}: {
  photoSrc: string;
  stage: IntroStage;
}) => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-0 z-30 hidden overflow-hidden lg:block",
      stage === "hidden" && "opacity-100 transition-none",
      stage === "playing" &&
        "opacity-0 transition-opacity delay-(--reveal-delay) duration-420 ease-(--reveal-ease)",
      stage === "composed" && "opacity-0"
    )}
    style={REVEAL_STYLE}
  >
    <Image
      alt=""
      className="object-cover brightness-80 contrast-105 grayscale-42"
      fill
      sizes="1024px"
      src={photoSrc}
    />
    {GUTTER_LEFT.map((left, i) => {
      const gutterStyle: GutterStyle = {
        "--cut-delay": `${CUT_START + i * CUT_STAGGER}s`,
        "--gutter-left": left,
      };
      return (
        <div
          className={cn(
            "bg-background absolute inset-y-0 left-(--gutter-left) w-4 origin-top",
            stage === "hidden" && "transform-[scaleY(0)] transition-none",
            stage === "playing" &&
              "transform-[scaleY(1)] transition-transform delay-(--cut-delay) duration-420 ease-(--cut-ease)",
            stage === "composed" && "transform-[scaleY(1)]"
          )}
          key={left}
          style={gutterStyle}
        />
      );
    })}
  </div>
);

export const IntroReplay = ({ onReplay }: { onReplay: () => void }) => (
  <button
    className="border-foreground/30 tracking-caps absolute right-5 bottom-4 z-40 hidden items-center gap-2 rounded-full border px-3 py-2 font-mono text-xs font-medium uppercase opacity-60 transition-opacity hover:opacity-100 lg:inline-flex"
    onClick={onReplay}
    type="button"
  >
    <span aria-hidden="true">↻</span> Replay
  </button>
);
