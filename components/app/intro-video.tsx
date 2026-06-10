"use client";

import dynamic from "next/dynamic";
import { type RefObject, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// @remotion/player pulls in the Remotion runtime; keep it out of the landing
// screen's initial bundle and off the server by loading it lazily + client-only.
const IntroPlayer = dynamic(() => import("@/components/app/intro-player"), {
  ssr: false,
});

// Mount the player only once its frame nears the viewport, so the Remotion
// chunk isn't fetched (and an autoplay loop isn't started) while it's offscreen.
function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, inView]);
  return inView;
}

/**
 * The placeholder intro clip — a Remotion composition rendered on-page through
 * @remotion/player. Lazily mounted only once scrolled into view, and tagged with
 * a "Coming soon" badge (its closing beat says the same) so it always reads as a
 * stand-in until the real walkthrough is produced. The surrounding section copy
 * lives at the call site.
 */
export function IntroVideo({ className }: { className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef);
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-foreground",
        className
      )}
      ref={frameRef}
    >
      {inView ? <IntroPlayer /> : null}
      <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-medium font-mono text-[10px] text-primary-foreground uppercase tracking-[0.16em] shadow-sm">
        <span className="size-1.5 rounded-full bg-primary-foreground/80" />
        Coming soon
      </span>
    </div>
  );
}
