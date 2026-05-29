"use client";

import { Bike, Footprints, MapPin, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedActivity } from "@/lib/parse-activity";

interface StravaSummaryActivity {
  distance: number;
  id: number;
  moving_time: number;
  name: string;
  sport_type: string;
  start_date: string;
  total_elevation_gain?: number;
}

interface StravaPickerProps {
  onActivityLoaded: (parts: ParsedActivity[]) => void;
  onCancel: () => void;
  onReauth: () => void;
}

type LoadResult =
  | { kind: "ok"; activities: StravaSummaryActivity[] }
  | { kind: "reauth" }
  | { kind: "error"; message: string };

async function fetchActivities(): Promise<LoadResult> {
  try {
    const res = await fetch("/api/strava/activities", { cache: "no-store" });
    if (res.status === 401) {
      return { kind: "reauth" };
    }
    if (!res.ok) {
      return {
        kind: "error",
        message: `Couldn't reach Strava (${res.status}).`,
      };
    }
    const data = (await res.json()) as {
      activities: StravaSummaryActivity[];
    };
    return { kind: "ok", activities: data.activities };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; activities: StravaSummaryActivity[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export function StravaPicker({
  onActivityLoaded,
  onCancel,
  onReauth,
}: StravaPickerProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchActivities().then((result) => {
      if (cancelled) {
        return;
      }
      if (result.kind === "reauth") {
        onReauth();
        return;
      }
      if (result.kind === "error") {
        setState({ kind: "error", message: result.message });
        return;
      }
      setState(
        result.activities.length === 0
          ? { kind: "empty" }
          : { kind: "ready", activities: result.activities }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [onReauth]);

  const handlePick = async (id: number) => {
    setPickingId(id);
    setPickError(null);
    try {
      const res = await fetch(`/api/strava/activity/${id}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        onReauth();
        return;
      }
      if (!res.ok) {
        setPickError(`Strava returned ${res.status}.`);
        return;
      }
      const data = (await res.json()) as { parts: ParsedActivity[] };
      if (!data.parts?.length) {
        setPickError("This activity has no data we can use.");
        return;
      }
      onActivityLoaded(data.parts);
    } catch (err) {
      setPickError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pt-20 pb-8 md:px-10 lg:pt-24">
      <div className="font-medium font-mono text-xs tracking-[0.32em] opacity-55">
        STEP 02 / 03 · PICK FROM STRAVA
      </div>
      <h1 className="mt-7 font-heading text-5xl uppercase leading-[0.92] tracking-tight sm:text-6xl">
        Your recent <span className="text-primary">efforts.</span>
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed opacity-65">
        We pulled the last 30 activities from your Strava. Pick one to turn into
        a card.
      </p>

      <div className="mt-10 flex flex-col gap-2">
        {state.kind === "loading"
          ? SKELETON_KEYS.map((k) => (
              <Skeleton className="h-[68px] w-full" key={`strava-skel-${k}`} />
            ))
          : null}

        {state.kind === "empty" ? (
          <div className="border border-foreground/30 border-dashed p-6 text-center opacity-70">
            No activities yet. Record one in Strava, then come back.
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className="border border-destructive/40 border-dashed p-6 text-center">
            <div className="font-mono text-destructive text-xs">
              {state.message}
            </div>
            <Button
              className="mt-3"
              onClick={onReauth}
              size="sm"
              variant="outline"
            >
              Reconnect Strava
            </Button>
          </div>
        ) : null}

        {state.kind === "ready"
          ? state.activities.map((a) => (
              <ActivityRow
                activity={a}
                disabled={pickingId !== null && pickingId !== a.id}
                key={a.id}
                loading={pickingId === a.id}
                onPick={() => handlePick(a.id)}
              />
            ))
          : null}
      </div>

      {pickError ? (
        <div className="mt-4 font-mono text-destructive text-xs">
          {pickError}
        </div>
      ) : null}

      <div className="mt-8 flex justify-between border-foreground/15 border-t pt-6">
        <Button onClick={onCancel} variant="ghost">
          Back
        </Button>
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  loading,
  disabled,
  onPick,
}: {
  activity: StravaSummaryActivity;
  loading: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const duration = formatDuration(activity.moving_time);
  return (
    <button
      className="group flex items-center gap-4 border border-foreground/15 px-4 py-3 text-left transition-colors hover:border-foreground/60 hover:bg-foreground/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || loading}
      onClick={onPick}
      type="button"
    >
      <SportIcon sportType={activity.sport_type} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-base">{activity.name}</div>
        <div className="mt-0.5 flex gap-3 font-mono text-[11px] tracking-wide opacity-60">
          <span>{formatDate(activity.start_date)}</span>
          <span aria-hidden>·</span>
          <span>{distanceKm} km</span>
          <span aria-hidden>·</span>
          <span>{duration}</span>
          {activity.total_elevation_gain ? (
            <>
              <span aria-hidden>·</span>
              <span>{Math.round(activity.total_elevation_gain)} m</span>
            </>
          ) : null}
        </div>
      </div>
      <span className="font-mono text-[10px] tracking-[0.18em] opacity-50 group-hover:opacity-100">
        {loading ? "LOADING…" : "PICK →"}
      </span>
    </button>
  );
}

function SportIcon({ sportType }: { sportType: string }) {
  const s = sportType.toLowerCase();
  const cls = "size-5 shrink-0 opacity-70";
  if (s.includes("swim")) {
    return <Waves aria-hidden className={cls} />;
  }
  if (s.includes("ride") || s.includes("bike") || s.includes("cycl")) {
    return <Bike aria-hidden className={cls} />;
  }
  if (s.includes("run")) {
    return <Footprints aria-hidden className={cls} />;
  }
  return <MapPin aria-hidden className={cls} />;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}
