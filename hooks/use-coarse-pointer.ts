"use client";

import { useState } from "react";

/**
 * True on touch / coarse-pointer devices. Used to keep the video player
 * controls always visible there — without a hover to summon them, the bar
 * (and the fullscreen button) would otherwise stay hidden on mobile.
 *
 * Read once at mount: the players that use it are client-only (`next/dynamic`
 * ssr:false), so there's no hydration-mismatch risk.
 */
export function useCoarsePointer(): boolean {
  const [coarse] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches
  );
  return coarse;
}
