"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * After the Strava OAuth round-trip we land on `/?strava=...`. One-shot
 * cold-start read of the URL: toast the outcome, call `onConnected` on
 * success (the caller opens the wizard's Strava picker), then strip the
 * param so a reload doesn't re-fire. Re-runs are no-ops once stripped.
 */
export function useStravaReturnToast(onConnected: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("strava");
    if (!flag) {
      return;
    }
    switch (flag) {
      case "connected":
        toast.success("Connected to Strava");
        // Stay on the empty state; the wizard + its Strava picker open instead.
        onConnected();
        break;
      case "denied":
        toast.error("You declined to connect Strava. You can try again.");
        break;
      case "state_mismatch":
        toast.error("Couldn't verify the Strava sign-in. Please try again.");
        break;
      case "token_exchange":
        toast.error("Strava rejected the sign-in. Try again in a moment.");
        break;
      case "failed":
        toast.error("Couldn't start the Strava sign-in. Try again.");
        break;
      case "bounce_rejected":
        toast.error(
          "The Strava sign-in was redirected to an unrecognised host. Aborted."
        );
        break;
      default:
        toast.error(`Couldn't connect to Strava (${flag})`);
    }
    // Strip the param so a reload doesn't re-fire the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("strava");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, [onConnected]);
}
