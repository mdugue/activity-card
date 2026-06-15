"use client";

import { VideoPlayer } from "@/components/app/video-player";
import {
  HERO_DURATION_IN_FRAMES,
  HERO_FPS,
  HERO_HEIGHT,
  HERO_WIDTH,
  Hero,
} from "@/remotion/videos/hero";

// The actual @remotion/player surface, split into its own chunk and loaded
// client-only (see intro-video.tsx). Default export so `next/dynamic` can pick
// it up without a `.then(m => m.X)` wrapper that loses the prop types.
export default function IntroPlayer() {
  return (
    <VideoPlayer
      autoPlayOnView
      className="size-full"
      component={Hero}
      compositionHeight={HERO_HEIGHT}
      compositionWidth={HERO_WIDTH}
      durationInFrames={HERO_DURATION_IN_FRAMES}
      fps={HERO_FPS}
      loop
      // A flattering still for the pre-play / reduced-motion state; playback
      // itself starts from frame 0 the moment the band scrolls into view.
      posterFrame={365}
    />
  );
}
