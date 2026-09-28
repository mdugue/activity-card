import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The inline style carrying the card's aspect ratio as a CSS custom property. */
interface CardAspectStyle extends CSSProperties {
  "--card-aspect": number;
}

/** The single card's 4:5 master (1080×1350). */
const DEFAULT_ASPECT_RATIO = 1080 / 1350;

interface CardStageProps {
  /** card aspect ratio (w / h) driving the fit-to-box width cap; default 4:5 */
  aspectRatio?: number;
  children: ReactNode;
  /**
   * Width-cap classes for the card (mobile + desktop) — the only thing that
   * differs between the previews, e.g. `"max-w-[400px] lg:max-w-[460px]"` for the
   * single card vs `"max-w-[360px]"` for the carousel window.
   */
  maxWidthClassName: string;
}

/**
 * Shared mobile "stage" for a fixed-aspect preview card, used by both editors so
 * their fit-to-box behaviour can't drift. On mobile it scales the card to fit
 * BOTH width and height (`min(100cqw, 100cqh · aspectRatio)`); on desktop it's a
 * width-capped, centred card. The inner wrapper is `relative` for a theme's
 * absolute "Adjust" overlay.
 *
 * `aspectRatio` (w/h) rides the `--card-aspect` CSS var (Tailwind arbitrary
 * values are static) and must match the inner card's own `aspect-ratio`. Needs a
 * bounded-height ancestor: it's a `container-type:size` container, so `100cqh`
 * resolves to 0 unless an ancestor supplies a definite block-size.
 */
export const CardStage = ({
  children,
  maxWidthClassName,
  aspectRatio = DEFAULT_ASPECT_RATIO,
}: CardStageProps) => {
  const style: CardAspectStyle = { "--card-aspect": aspectRatio };
  return (
    <div
      className="max-lg:[container-type:size] max-lg:grid max-lg:min-h-0 max-lg:flex-1 max-lg:place-items-center lg:block"
      style={style}
    >
      <div
        className={cn(
          "relative mx-auto max-lg:w-[min(100cqw,calc(100cqh*var(--card-aspect)))] lg:w-full",
          maxWidthClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};
