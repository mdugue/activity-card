"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useInView } from "@/hooks/use-in-view";
import { FEATURE_VIDEOS, type FeatureVideo } from "@/remotion/videos/catalog";

// The Remotion runtime stays out of the page's initial bundle — each player
// chunk loads client-only, and only once its card scrolls near the viewport.
const TutorialPlayer = dynamic(
  () => import("@/components/app/tutorial-player"),
  { ssr: false }
);

function formatDuration(video: FeatureVideo): string {
  const seconds = Math.round(video.durationInFrames / video.fps);
  return `0:${String(seconds).padStart(2, "0")}`;
}

function TutorialCard({
  index,
  video,
}: {
  index: number;
  video: FeatureVideo;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef);
  return (
    <article className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
      <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
        <p className="caption-label text-primary opacity-100">
          {String(index + 1).padStart(2, "0")} · {video.kicker}
        </p>
        <h2 className="mt-3 text-balance font-heading text-3xl uppercase leading-[0.95] lg:text-4xl">
          {video.title}
        </h2>
        <p className="mt-4 max-w-md text-foreground/70 leading-relaxed">
          {video.blurb}
        </p>
        <p className="caption-micro mt-4">{formatDuration(video)} min</p>
      </div>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg bg-foreground shadow-2xl shadow-foreground/25 ring-1 ring-foreground/10"
        ref={frameRef}
      >
        {inView ? <TutorialPlayer index={index} /> : null}
      </div>
    </article>
  );
}

export function TutorialsGallery() {
  return (
    <div className="flex flex-col gap-20 lg:gap-28">
      {FEATURE_VIDEOS.map((video, index) => (
        <TutorialCard index={index} key={video.id} video={video} />
      ))}
    </div>
  );
}
