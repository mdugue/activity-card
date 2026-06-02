import Image from "next/image";

interface StravaConnectButtonProps {
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
export function StravaConnectButton({ ref }: StravaConnectButtonProps) {
  return (
    <a
      aria-label="Connect with Strava"
      className="inline-flex items-center justify-center rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
