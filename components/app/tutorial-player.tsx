"use client";

import { Player } from "@remotion/player";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { FEATURE_VIDEOS } from "@/remotion/videos/catalog";

/**
 * One tutorial's @remotion/player surface — split into its own chunk and
 * loaded client-only by the gallery (see tutorials-gallery.tsx). Addressed by
 * catalogue index so the dynamic-import boundary only passes a number.
 * Tutorials don't autoplay: the viewer presses play, the player parks on the
 * settled title frame until then.
 */
export default function TutorialPlayer({ index }: { index: number }) {
  const video = FEATURE_VIDEOS[index];
  // Touch devices have no hover to reveal the controls bar; keep it (and the
  // fullscreen button) visible there.
  const coarse = useCoarsePointer();
  if (!video) {
    return null;
  }
  return (
    <Player
      acknowledgeRemotionLicense
      allowFullscreen
      alwaysShowControls={coarse}
      component={video.component}
      compositionHeight={video.height}
      compositionWidth={video.width}
      controls
      durationInFrames={video.durationInFrames}
      fps={video.fps}
      initialFrame={40}
      style={{ height: "100%", width: "100%" }}
    />
  );
}
