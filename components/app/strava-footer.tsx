import { cn } from "@/lib/utils";

// The "Compatible with Strava" attribution required by §1.2 + §4 of the brand
// guidelines: one approved phrase, brand orange (#FC5200), bold, underlined on
// hover (§3), linking to strava.com. Kept as a standalone so the start screen's
// footer section and the picker can both reuse the exact approved mark.
export const StravaCompatLink = ({ className }: { className?: string }) => (
  <a
    className={cn("text-strava font-semibold hover:underline", className)}
    href="https://www.strava.com"
    rel="noopener noreferrer"
    target="_blank"
  >
    Compatible with Strava
  </a>
);

// Standalone footer wrapper, used on the Strava picker. The landing page renders
// `StravaCompatLink` inline within its own footer section instead.
export const StravaFooter = () => (
  <footer className="tracking-caps-md flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 font-mono text-xs uppercase opacity-70">
    <StravaCompatLink />
  </footer>
);
