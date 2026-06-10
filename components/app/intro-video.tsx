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
 * The empty-state "How it works" band: a short, looping intro that sits below
 * the action bar so the page reads value → CTA → see-it-in-action. The clip is
 * a Remotion composition (placeholder until the real walkthrough is produced),
 * rendered on-page through @remotion/player.
 */
export function IntroVideo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef);
  return (
    <section className="w-full max-w-[64rem] lg:mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="caption-label">See it in action</p>
          <p className="mt-1.5 font-heading text-2xl uppercase leading-none lg:text-3xl">
            How it works
          </p>
        </div>
        <p className="hidden font-medium font-mono text-[11px] text-foreground/45 uppercase tracking-[0.18em] sm:block">
          ~5 sec
        </p>
      </div>
      <div
        className="mt-4 aspect-video w-full overflow-hidden bg-foreground ring-1 ring-foreground/10"
        ref={frameRef}
      >
        {inView ? <IntroPlayer /> : null}
      </div>
    </section>
  );
}
