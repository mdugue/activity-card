"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

// Effect cleanup for the branches that attached no observer.
const noCleanup = (): void => {
  // No observer was attached, so there is nothing to disconnect.
};

/**
 * Two-way viewport gate: true while the element is on screen, false once it
 * scrolls away again. Unlike the one-shot `useInView`, this lets a heavy
 * subtree be torn down offscreen, not only deferred. Pass `enabled: false` to
 * skip observing (the result is then always true).
 */
export const useOnScreen = (
  ref: RefObject<Element | null>,
  enabled = true
): boolean => {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || el === null) {
      return noCleanup;
    }
    // No IntersectionObserver (old browsers / some embedded webviews): treat
    // the element as visible so it always renders.
    if (typeof IntersectionObserver === "undefined") {
      // oxlint-disable-next-line react/set-state-in-effect
      setOnScreen(true);
      return noCleanup;
    }
    const io = new IntersectionObserver(([entry]) => {
      setOnScreen(entry.isIntersecting);
    });
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [ref, enabled]);
  return !enabled || onScreen;
};
