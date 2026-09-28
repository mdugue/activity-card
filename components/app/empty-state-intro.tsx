"use client";

// The overlay pieces of the connect empty state's intro animation (desktop
// only): the seamless photo + guillotine gutters that slice into the claim
// panels, and the Replay control. Timeline + per-element styles live in
// `empty-state-intro-motion.ts`; the stage machine in
// `hooks/use-empty-state-intro.ts`.

import Image from "next/image";
import type { CSSProperties } from "react";

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

const revealStyle = (stage: IntroStage): CSSProperties => {
  if (stage === "hidden") {
    return { opacity: 1, transition: "none" };
  }
  if (stage === "playing") {
    return {
      opacity: 0,
      transition: `opacity 0.42s ease-in-out ${CUT_START + GUTTER_LEFT.length * CUT_STAGGER}s`,
    };
  }
  return { opacity: 0 };
};

const gutterStyle = (stage: IntroStage, i: number): CSSProperties => {
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
        className="bg-background absolute inset-y-0 w-4 origin-top"
        key={left}
        style={{ left, ...gutterStyle(stage, i) }}
      />
    ))}
  </div>
);

export const IntroReplay = ({ onReplay }: { onReplay: () => void }) => (
  <button
    className="border-foreground/30 absolute right-5 bottom-4 z-40 hidden items-center gap-2 rounded-full border px-3 py-2 font-mono text-xs font-medium tracking-[0.16em] uppercase opacity-60 transition-opacity hover:opacity-100 lg:inline-flex"
    onClick={onReplay}
    type="button"
  >
    <span aria-hidden="true">↻</span> Replay
  </button>
);
