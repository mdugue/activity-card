"use client";

import dynamic from "next/dynamic";
import { type RefObject, useEffect, useRef, useState } from "react";

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
 * A small, secondary intro preview that sits well below the hero so it never
 * competes with the animated claim + panels. The clip itself is a placeholder
 * Remotion composition (rendered on-page through @remotion/player); the label
 * and its closing beat make clear the real walkthrough is still on the way.
 */
export function IntroVideo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef);
  return (
    <div className="mx-auto mt-16 flex w-full max-w-sm flex-col items-center lg:mt-24">
      <div className="flex items-center gap-2.5">
        <p className="caption-label">See how it works</p>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium font-mono text-[10px] text-primary uppercase tracking-[0.16em]">
          Coming soon
        </span>
      </div>
      <div
        className="relative mt-3 aspect-video w-full overflow-hidden bg-foreground ring-1 ring-foreground/10"
        ref={frameRef}
      >
        {inView ? <IntroPlayer /> : null}
      </div>
      <p className="mt-2.5 text-center font-medium font-mono text-[10px] text-foreground/40 uppercase tracking-[0.14em]">
        Placeholder preview — the real walkthrough is on its way
      </p>
    </div>
  );
}
