"use client";

import { useCallback, useEffect, useState } from "react";

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

interface MeResponse {
  athlete?: StravaAthleteInfo | null;
  connected: boolean;
}

export interface UseStravaConnection extends State {
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Tracks the user's Strava connection state via `/api/strava/me`. The cookies
 * themselves are httpOnly, so this hook is the only way the client UI learns
 * whether to render "Connect" vs "Pick from Strava".
 */
export function useStravaConnection(): UseStravaConnection {
  const [state, setState] = useState<State>({
    connected: false,
    athlete: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/strava/me", { cache: "no-store" });
      if (!res.ok) {
        setState({
          connected: false,
          athlete: null,
          loading: false,
          error: "fetch_failed",
        });
        return;
      }
      const data = (await res.json()) as MeResponse;
      setState({
        connected: data.connected,
        athlete: data.athlete ?? null,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        connected: false,
        athlete: null,
        loading: false,
        error: "fetch_failed",
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
        connected: false,
        athlete: null,
        loading: false,
        error: null,
      });
    } catch {
      await refresh();
    }
  }, [refresh]);

  // One-shot read of an external system (the cookie store, via the API).
  // The setState-in-effect rule's preferred "fix" would be a custom store +
  // useSyncExternalStore — that buys nothing for a cold-start hydration.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    refresh();
  }, [refresh]);

  return { ...state, refresh, disconnect };
}
