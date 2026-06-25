"use client";

import { VideoPlayer } from "@/components/app/video-player";
import { FEATURE_VIDEOS } from "@/remotion/videos/catalog";

/**
 * One tutorial's player surface — split into its own chunk and loaded
 * client-only by the gallery (see tutorials-gallery.tsx). Addressed by
 * catalogue index so the dynamic-import boundary only passes a number.
 * Tutorials don't autoplay: the viewer presses play; until then the player
 * rests on a settled title frame.
 */
export default function TutorialPlayer({ index }: { index: number }) {
  const video = FEATURE_VIDEOS[index];
  if (!video) {
    return null;
  }
  return (
    <VideoPlayer
      className="size-full"
      component={video.component}
      compositionHeight={video.height}
      compositionWidth={video.width}
      durationInFrames={video.durationInFrames}
      fps={video.fps}
      posterFrame={40}
    />
  );
}
