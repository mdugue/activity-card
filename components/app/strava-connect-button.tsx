import Image from "next/image";
import { cn } from "@/lib/utils";

interface StravaConnectButtonProps {
  /** Extra classes for the anchor — e.g. a focal glow when the button is the
   * primary CTA. The brand asset itself is never restyled. */
  className?: string;
  /** Optional ref to focus the anchor on mount (mirrors the autoFocus
   * behaviour the previous bespoke button had). */
  ref?: React.Ref<HTMLAnchorElement>;
}

/**
 * The official "Connect with Strava" button from Strava's brand kit
 * (https://developers.strava.com/guidelines/#brand). 237×48 SVG, orange
 * variant, used verbatim — the brand guidelines forbid recolouring,
 * resizing disproportionately, animating, or otherwise modifying the
 * asset. We render it inside an anchor that points at our OAuth-init
 * route; the brand-required link target is `https://www.strava.com/oauth/authorize`
 * which `/api/strava/authorize` redirects to.
 */
export function StravaConnectButton({
  className,
  ref,
}: StravaConnectButtonProps) {
  return (
    <a
      aria-label="Connect with Strava"
      className={cn(
        "inline-flex items-center justify-center rounded-md outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      href="/api/strava/authorize"
      ref={ref}
    >
      <Image
        alt=""
        height={48}
        priority
        src="/strava/btn-connect-with-strava-orange.svg"
        width={237}
      />
    </a>
  );
}
