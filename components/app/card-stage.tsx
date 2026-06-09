import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardStageProps {
  children: ReactNode;
  /**
   * Width-cap classes for the card (mobile + desktop) — the only thing that
   * differs between the previews, e.g. `"max-w-[400px] lg:max-w-[460px]"` for the
   * single card vs `"max-w-[360px]"` for the carousel window.
   */
  maxWidthClassName: string;
}

/**
 * Shared mobile "stage" for a fixed-aspect 1080×1350 preview card, used by both
 * the single-card and carousel editors so their fit-to-box behaviour can't drift.
 *
 * On the mobile app-shell it fills the area it's given and scales the card to fit
 * BOTH width and height (`min(100cqw, 100cqh·1080/1350)`), so the focused toolbar
 * never crops it; on desktop it's a width-capped, centred card. The inner wrapper
 * is `relative` so a theme's absolute "Adjust" badge / overlay can position
 * against it.
 *
 * Requires a bounded-height ancestor: the stage is a `container-type:size`
 * container, so `100cqh` resolves to 0 unless an ancestor supplies a definite
 * block-size (the editor shell does, via `h-[100dvh]` → a `min-h-0` flex/grid
 * chain). The `1080/1350` factor mirrors the card's `aspect-[1080/1350]` — keep
 * the two in sync.
 */
export function CardStage({ children, maxWidthClassName }: CardStageProps) {
  return (
    <div className="max-lg:grid max-lg:min-h-0 max-lg:flex-1 max-lg:place-items-center lg:block max-lg:[container-type:size]">
      <div
        className={cn(
          "relative mx-auto max-lg:w-[min(100cqw,calc(100cqh*1080/1350))] lg:w-full",
          maxWidthClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
