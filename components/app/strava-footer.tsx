/**
 * App-wide footer carrying the "Compatible with Strava" attribution —
 * Strava brand guidelines §4 say that if you refer to interoperability
 * with Strava you must use one of "Powered by Strava" or "Compatible
 * with Strava". Plain text in brand orange (#FC5200) satisfies the rule
 * without using the API logo asset (§1.2 makes the logo optional).
 *
 * Lives in `app/layout.tsx` as a flex child of `<body>` so it pins to
 * the bottom of every page. Stays out of the rasterised card export —
 * the off-screen card mount in edit-state uses `position:fixed` so this
 * footer never reflows into html-to-image's clone.
 */
export function StravaFooter() {
  return (
    <footer className="mt-auto flex items-center justify-center gap-1 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
      <a
        className="font-semibold text-[#FC5200] hover:underline"
        href="https://www.strava.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        Compatible with Strava
      </a>
    </footer>
  );
}
