// Timeline + per-element styles for the connect empty state's intro animation
// (desktop only). The claim panels slice a seamless photo into story slides
// and fill them with data, then a single page claim fades + slides up once
// that reveal has settled. The overlay components live in
// `empty-state-intro.tsx`; the stage machine in `hooks/use-empty-state-intro`.
//
// Design contract (important): the *composed* (finished) state is the base.
// "Hidden" values are only ever applied via JS after mount, so no-JS, SSR,
// reduced-motion and mobile all render the finished layout directly. The
// animation is layered on top via CSS transitions driven by a single stage
// flip, with per-element delays sequencing the reveal.

import type { CSSProperties } from "react";

export type IntroStage = "composed" | "hidden" | "playing";
type IntroRole = "scrim" | "tint" | "num" | "word" | "content";

const RISE_PX = 14;
const RISE_EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
// Timeline constants (seconds).
const FILL_START = 1.15;
const FILL_STAGGER = 0.16;
// Right after the slices are cut, the trailing ones recede — softly and slowly,
// overlapping the data fill — so the eye stays on slide one. Resting opacity
// drops the farther a panel sits from the first. The delay clears the photo
// handoff (~1.4s) so the seam stays clean. Desktop only; the mobile rail keeps
// every slide at full strength.
const FADE_DELAY = 1.25;
const FADE_DURATION = 1.5;
const PANEL_REST_OPACITY = [1, 0.8, 0.6];
// Tailwind counterparts of PANEL_REST_OPACITY — keep the two in lockstep (and
// the same length as the panel list in empty-state.tsx). These are the composed
// (no-JS / reduced-motion) resting values, lg-gated.
export const PANEL_REST_CLASS = ["", "lg:opacity-80", "lg:opacity-60"];

const CLAIM_RISE_PX = 18;
const CLAIM_DELAY = 1.7;
const CLAIM_DURATION = 0.7;

/** No inline overrides: the element keeps its Tailwind resting look. */
const RESTING: CSSProperties = {};

interface RoleMotion {
  dur: number;
  ease: string;
  offset: number;
  opacity: number;
  rises: boolean;
}

// Per-element style for the panel overlays (scrim/tint/number/word/graphic).
// `composed` applies nothing so the element keeps its Tailwind resting look.
const ROLE = {
  content: {
    dur: 0.55,
    ease: "ease-out",
    offset: 0.13,
    opacity: 1,
    rises: true,
  },
  num: { dur: 0.5, ease: "ease-out", offset: 0.05, opacity: 1, rises: true },
  scrim: { dur: 0.5, ease: "ease-out", offset: 0, opacity: 1, rises: false },
  tint: { dur: 0.5, ease: "ease-out", offset: 0, opacity: 0.25, rises: false },
  word: { dur: 0.55, ease: RISE_EASE, offset: 0.09, opacity: 1, rises: true },
} satisfies Record<IntroRole, RoleMotion>;

export const panelPartStyle = (
  stage: IntroStage,
  role: IntroRole,
  panelIndex: number
): CSSProperties => {
  if (stage === "composed") {
    return RESTING;
  }
  const r: RoleMotion = ROLE[role];
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
};

// Whole-panel recede applied to each panel root. Holds full opacity through the
// fill (the delay) so the photo handoff stays seamless, then eases down to the
// resting value. `composed` defers to the Tailwind PANEL_REST_CLASS.
export const panelFadeStyle = (
  stage: IntroStage,
  panelIndex: number
): CSSProperties => {
  const rest = PANEL_REST_OPACITY[panelIndex];
  if (stage === "composed" || rest === 1) {
    return RESTING;
  }
  if (stage === "hidden") {
    return { opacity: 1, transition: "none" };
  }
  return {
    opacity: rest,
    transition: `opacity ${FADE_DURATION}s ease-in-out ${FADE_DELAY}s`,
  };
};

// The single page claim: fades + slides up once the panel reveal has settled.
// `composed` defers to the element's resting Tailwind look (no-JS / mobile /
// reduced-motion all show it in place from the start).
export const claimStyle = (stage: IntroStage): CSSProperties => {
  if (stage === "composed") {
    return RESTING;
  }
  if (stage === "hidden") {
    return {
      opacity: 0,
      transform: `translateY(${CLAIM_RISE_PX}px)`,
      transition: "none",
    };
  }
  return {
    opacity: 1,
    transform: "translateY(0)",
    transition: `opacity ${CLAIM_DURATION}s ${RISE_EASE} ${CLAIM_DELAY}s, transform ${CLAIM_DURATION}s ${RISE_EASE} ${CLAIM_DELAY}s`,
  };
};
