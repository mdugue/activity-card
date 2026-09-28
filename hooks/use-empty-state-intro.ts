"use client";

// The stage machine for the connect empty state's intro animation (see
// `components/app/empty-state-intro-motion.ts` for the timeline + styles).
// The composed stage is the base; the intro only plays on a desktop-width,
// motion-welcoming client, and can be replayed.

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import type { IntroStage } from "@/components/app/empty-state-intro-motion";

// The single page claim that fades + slides up once the panel reveal is done.
const CLAIM = "Make every effort worth sharing.";

// Only animate where the 3-up grid actually exists and motion is welcome.
const shouldPlayIntro = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return window.innerWidth >= 1024;
};

// useLayoutEffect on the client (sets the hidden state before paint), a no-op
// on the server — avoids React's SSR warning without losing the pre-paint set.
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// Effect cleanup for the run that doesn't play.
const noCleanup = (): void => {
  // Nothing was scheduled, so there is nothing to cancel.
};

export interface EmptyStateIntro {
  claim: string;
  replay: () => void;
  showReplay: boolean;
  stage: IntroStage;
}

export const useEmptyStateIntro = (): EmptyStateIntro => {
  const [stage, setStage] = useState<IntroStage>("composed");
  const [showReplay, setShowReplay] = useState(false);
  const [runId, setRunId] = useState(0);

  // Re-runs whenever `runId` is bumped (initial mount + each Replay). Sets the
  // hidden start state before paint, then a double rAF flips to "playing" once
  // that frame is committed so the CSS transitions actually fire.
  useIsoLayoutEffect(() => {
    if (!shouldPlayIntro()) {
      return noCleanup;
    }
    setStage("hidden");
    setShowReplay(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setStage("playing");
      });
    });
    const timers = [
      // Surface the replay control once the claim has finished sliding in.
      window.setTimeout(() => {
        setShowReplay(true);
      }, 2600),
      // Lock the composed end-state in case a background tab froze the
      // transition clock mid-flight (after claim + recede have settled).
      window.setTimeout(() => {
        setStage("composed");
      }, 3200),
    ];
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      for (const t of timers) {
        window.clearTimeout(t);
      }
    };
  }, [runId]);

  const replay = useCallback(() => {
    setRunId((r) => r + 1);
  }, []);
  return { claim: CLAIM, replay, showReplay, stage };
};
