// Start-screen footer: the "Compatible with Strava" attribution required by
// §1.2 + §4 of the brand guidelines (plain-text reference, one approved
// phrase). Rendered only on the empty state — the connection status and
// Disconnect control live in the Strava picker, so they're reachable without
// cluttering the editor or pushing its layout. Stateless and tiny.
export function StravaFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
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
