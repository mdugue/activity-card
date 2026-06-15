"use client";

import { Player } from "@remotion/player";
import { useState } from "react";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import {
  HERO_DURATION_IN_FRAMES,
  HERO_FPS,
  HERO_HEIGHT,
  HERO_WIDTH,
  Hero,
} from "@/remotion/videos/hero";

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
  // Touch devices have no hover to reveal the controls bar, so keep it (and the
  // fullscreen button) always visible there.
  const coarse = useCoarsePointer();
  return (
    <Player
      acknowledgeRemotionLicense
      allowFullscreen
      alwaysShowControls={coarse}
      autoPlay={autoPlay}
      component={Hero}
      compositionHeight={HERO_HEIGHT}
      compositionWidth={HERO_WIDTH}
      controls
      durationInFrames={HERO_DURATION_IN_FRAMES}
      fps={HERO_FPS}
      // Park on the settled image-led card reveal so the band shows a real card
      // whether or not autoplay is allowed — never the blank first frame. Once
      // playing it loops through the full cut.
      initialFrame={365}
      loop
      style={{ height: "100%", width: "100%" }}
    />
  );
}
