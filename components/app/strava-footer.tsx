"use client";

import { useStravaConnection } from "@/hooks/use-strava-connection";

/**
 * App-wide footer: persistent across every AppState. Carries the
 * "Compatible with Strava" attribution required by §1.2 + §4 of the
 * brand guidelines (plain text reference using one of the approved
 * phrases) and exposes the central Disconnect control when the user
 * is connected — so reaching it never depends on being in the edit
 * state.
 *
 * Stays out of the rasterised card export: the off-screen card mount
 * in edit-state uses `position:fixed`, so this footer never reflows
 * into html-to-image's clone.
 */
export function StravaFooter() {
  const strava = useStravaConnection();
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
      <a
        className="font-semibold text-[#FC5200] hover:underline"
        href="https://www.strava.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        Compatible with Strava
      </a>
      {strava.connected ? (
        <>
          <span aria-hidden>·</span>
          <span>
            {strava.athlete?.firstname
              ? `Connected as ${strava.athlete.firstname}`
              : "Connected"}
          </span>
          <span aria-hidden>·</span>
          <button
            className="underline-offset-4 hover:underline"
            onClick={() => {
              strava.disconnect();
            }}
            type="button"
          >
            Disconnect
          </button>
        </>
      ) : null}
    </footer>
  );
}
