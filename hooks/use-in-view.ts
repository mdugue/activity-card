"use client";

import { type RefObject, useEffect, useState } from "react";

/**
 * One-shot viewport gate: flips to true the first time the element nears the
 * viewport, then stays true. Used to lazy-mount the Remotion players so their
 * chunk isn't fetched (and an autoplay loop isn't started) while offscreen.
 */
export function useInView(ref: RefObject<Element | null>): boolean {
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
