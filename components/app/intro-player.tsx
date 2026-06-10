"use client";

import { Player } from "@remotion/player";
import { useState } from "react";
import {
  EffortIntro,
  INTRO_DURATION_IN_FRAMES,
  INTRO_FPS,
  INTRO_HEIGHT,
  INTRO_WIDTH,
} from "@/remotion/composition";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// The actual @remotion/player surface, split into its own chunk and loaded
// client-only (see intro-video.tsx). Default export so `next/dynamic` can pick
// it up without a `.then(m => m.X)` wrapper that loses the prop types.
export default function IntroPlayer() {
  // Client-only render (dynamic ssr:false), so this one-shot media-query read
  // is safe and can't cause a hydration mismatch. Reduced-motion users get a
  // still they can play on demand instead of an autoplaying loop.
  const [autoPlay] = useState(() => !prefersReducedMotion());
  return (
    <Player
      acknowledgeRemotionLicense
      autoPlay={autoPlay}
      component={EffortIntro}
      compositionHeight={INTRO_HEIGHT}
      compositionWidth={INTRO_WIDTH}
      controls
      durationInFrames={INTRO_DURATION_IN_FRAMES}
      fps={INTRO_FPS}
      // Park on a settled frame so the band shows the finished lockup whether or
      // not autoplay is allowed — never the blank first frame. Once playing it
      // loops through the full draw-in.
      initialFrame={90}
      loop
      style={{ height: "100%", width: "100%" }}
    />
  );
}
