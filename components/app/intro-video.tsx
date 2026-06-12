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
    // No IntersectionObserver (old browsers / some embedded webviews): skip the
    // lazy gate and just mount, so the section always renders. One-shot
    // cold-start sync — the initial state stays false for SSR parity.
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInView(true);
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
 * The hero clip — the Hero Remotion composition rendered on-page through
 * @remotion/player. Lazily mounted only once scrolled into view. The
 * surrounding section copy lives at the call site.
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
    </div>
  );
}
