"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

// @remotion/player pulls in the Remotion runtime; keep it out of the landing
// screen's initial bundle and off the server by loading it lazily + client-only.
const IntroPlayer = dynamic(() => import("@/components/app/intro-player"), {
  ssr: false,
});

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
