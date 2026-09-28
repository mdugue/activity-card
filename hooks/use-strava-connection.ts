"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod/mini";

export interface StravaAthleteInfo {
  avatar?: string | null;
  firstname?: string | null;
  id?: number;
}

interface State {
  athlete: StravaAthleteInfo | null;
  connected: boolean;
  /** Non-null when `/api/strava/me` itself failed (network down, server
   * 5xx). Distinct from `connected: false`, which is the legitimate
   * "user hasn't OAuthed yet" state. UI surfaces this as a destructive
   * Alert so the user knows the server is broken, not their grant. */
  error: "fetch_failed" | null;
  loading: boolean;
}

/** `/api/strava/me` payload, validated at the fetch boundary. */
const MeResponseSchema = z.object({
  athlete: z.optional(
    z.nullable(
      z.object({
        avatar: z.optional(z.nullable(z.string())),
        firstname: z.optional(z.nullable(z.string())),
        id: z.optional(z.number()),
      })
    )
  ),
  connected: z.boolean(),
});

export interface UseStravaConnection extends State {
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Tracks the user's Strava connection state via `/api/strava/me`. The cookies
 * themselves are httpOnly, so this hook is the only way the client UI learns
 * whether to render "Connect" vs "Pick from Strava".
 */
export const useStravaConnection = (): UseStravaConnection => {
  const [state, setState] = useState<State>({
    athlete: null,
    connected: false,
    error: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/strava/me", { cache: "no-store" });
      if (!res.ok) {
        setState({
          athlete: null,
          connected: false,
          error: "fetch_failed",
          loading: false,
        });
        return;
      }
      // A malformed body throws here and lands in the catch below.
      const data = MeResponseSchema.parse(await res.json());
      setState({
        athlete: data.athlete ?? null,
        connected: data.connected,
        error: null,
        loading: false,
      });
    } catch {
      setState({
        athlete: null,
        connected: false,
        error: "fetch_failed",
        loading: false,
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/strava/disconnect", { method: "POST" });
      if (!res.ok) {
        // Cookies may still be set — re-sync from the server rather than
        // pretending we disconnected.
        await refresh();
        return;
      }
      setState({
        athlete: null,
        connected: false,
        error: null,
        loading: false,
      });
    } catch {
      await refresh();
    }
  }, [refresh]);

  // One-shot read of an external system (the cookie store, via the API).
  // The setState-in-effect rule's preferred "fix" would be a custom store +
  // useSyncExternalStore — that buys nothing for a cold-start hydration.
  useEffect(() => {
    /* oxlint-disable-next-line react/set-state-in-effect */
    void refresh();
  }, [refresh]);

  return { ...state, disconnect, refresh };
};
