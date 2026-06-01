"use client";

import { Bike, Footprints, MapPin, Waves } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

const PER_PAGE = 30;

type LoadResult =
  | { kind: "ok"; activities: StravaSummaryActivity[] }
  | { kind: "reauth" }
  | { kind: "error"; message: string };

async function fetchActivities(page: number): Promise<LoadResult> {
  try {
    const res = await fetch(
      `/api/strava/activities?page=${page}&per_page=${PER_PAGE}`,
      { cache: "no-store" }
    );
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

async function fetchDetail(
  id: number
): Promise<ParsedActivity[] | { error: string } | "reauth"> {
  const res = await fetch(`/api/strava/activity/${id}`, { cache: "no-store" });
  if (res.status === 401) {
    return "reauth";
  }
  if (!res.ok) {
    return { error: `Strava returned ${res.status}.` };
  }
  const data = (await res.json()) as { parts: ParsedActivity[] };
  if (!data.parts?.length) {
    return { error: "This activity has no data we can use." };
  }
  return data.parts;
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
  const [page, setPage] = useState(1);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const multiId = useId();

  // The effect syncs UI state to the result of an external request keyed by
  // `page`. setState-in-effect is the right tool here — same pattern as the
  // localStorage hydration in page.tsx.
  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setState({ kind: "loading" });
    fetchActivities(page).then((result) => {
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
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      cancelled = true;
    };
  }, [page, onReauth]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMultiToggle = (next: boolean) => {
    setMultiSelect(next);
    setSelected(new Set());
    setPickError(null);
  };

  const handlePick = async (id: number) => {
    setPickingId(id);
    setPickError(null);
    const result = await fetchDetail(id);
    setPickingId(null);
    if (result === "reauth") {
      onReauth();
      return;
    }
    if ("error" in result) {
      setPickError(result.error);
      return;
    }
    onActivityLoaded(result);
  };

  const handleCombine = async () => {
    const ids = [...selected];
    if (ids.length < 2) {
      return;
    }
    setIsCombining(true);
    setPickError(null);
    const results = await Promise.all(ids.map((id) => fetchDetail(id)));
    setIsCombining(false);
    if (results.includes("reauth")) {
      onReauth();
      return;
    }
    const errored = results.find(
      (r): r is { error: string } =>
        r !== "reauth" && !Array.isArray(r) && "error" in r
    );
    if (errored) {
      setPickError(errored.error);
      return;
    }
    const allParts = results.flatMap((r) =>
      Array.isArray(r) ? r : []
    ) as ParsedActivity[];
    onActivityLoaded(allParts);
  };

  const activities = state.kind === "ready" ? state.activities : [];
  const canGoNext = activities.length === PER_PAGE;
  const canGoPrev = page > 1;
  const selectedCount = selected.size;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pt-20 pb-32 md:px-10 lg:pt-24">
      <div className="font-medium font-mono text-xs tracking-[0.32em] opacity-55">
        STEP 02 / 03 · PICK FROM STRAVA
      </div>
      <h1 className="mt-7 font-heading text-5xl uppercase leading-[0.92] tracking-tight sm:text-6xl">
        Your recent <span className="text-primary">efforts.</span>
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed opacity-65">
        Pick one to turn into a card — or flip the switch to combine 2+ into a
        triathlon / multi-sport effort.
      </p>

      <div className="mt-8 flex items-center justify-between border-foreground/15 border-y py-3">
        <Label className="flex items-center gap-3 text-sm" htmlFor={multiId}>
          <Switch
            checked={multiSelect}
            id={multiId}
            onCheckedChange={handleMultiToggle}
          />
          Multi-select
        </Label>
        {multiSelect ? (
          <span className="font-mono text-[11px] tracking-wide opacity-60">
            {selectedCount} selected
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col">
        <ActivityList
          activities={activities}
          isCombining={isCombining}
          multiSelect={multiSelect}
          onPick={handlePick}
          onReauth={onReauth}
          onToggleSelect={toggleSelect}
          page={page}
          pickingId={pickingId}
          selected={selected}
          state={state}
        />
      </div>

      {pickError ? (
        <Alert className="mt-4" variant="destructive">
          <AlertDescription>{pickError}</AlertDescription>
        </Alert>
      ) : null}

      {state.kind === "ready" || (state.kind === "empty" && page > 1) ? (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={!canGoPrev}
                className={canGoPrev ? "" : "pointer-events-none opacity-40"}
                onClick={() => canGoPrev && setPage((p) => p - 1)}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{page}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                aria-disabled={!canGoNext}
                className={canGoNext ? "" : "pointer-events-none opacity-40"}
                onClick={() => canGoNext && setPage((p) => p + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <div className="mt-8 flex justify-between border-foreground/15 border-t pt-6">
        <Button onClick={onCancel} variant="ghost">
          Back
        </Button>
      </div>

      {multiSelect && selectedCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-foreground/15 border-t bg-background/95 px-6 py-4 shadow-lg backdrop-blur md:px-10">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div className="font-medium font-mono text-xs tracking-wide opacity-80">
              {selectedCount === 1
                ? "Select one more to combine"
                : `${selectedCount} activities selected`}
            </div>
            <Button
              disabled={selectedCount < 2 || isCombining}
              onClick={handleCombine}
              size="lg"
            >
              {isCombining
                ? "Combining…"
                : `Combine ${selectedCount} activities`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface ActivityListProps {
  activities: StravaSummaryActivity[];
  isCombining: boolean;
  multiSelect: boolean;
  onPick: (id: number) => void;
  onReauth: () => void;
  onToggleSelect: (id: number) => void;
  page: number;
  pickingId: number | null;
  selected: Set<number>;
  state: LoadState;
}

function ActivityList({
  activities,
  isCombining,
  multiSelect,
  onPick,
  onReauth,
  onToggleSelect,
  page,
  pickingId,
  selected,
  state,
}: ActivityListProps) {
  if (state.kind === "loading") {
    return (
      <ItemGroup>
        {SKELETON_KEYS.map((k) => (
          <Skeleton className="h-[72px] w-full" key={`strava-skel-${k}`} />
        ))}
      </ItemGroup>
    );
  }
  if (state.kind === "empty") {
    return (
      <Alert>
        <AlertTitle>No activities on this page.</AlertTitle>
        <AlertDescription>
          {page > 1
            ? "You've reached the end of your activity history."
            : "Record an activity in Strava, then come back."}
        </AlertDescription>
      </Alert>
    );
  }
  if (state.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load activities</AlertTitle>
        <AlertDescription>
          <p>{state.message}</p>
          <Button
            className="mt-3"
            onClick={onReauth}
            size="sm"
            variant="outline"
          >
            Reconnect Strava
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <ItemGroup>
      {activities.map((a) => (
        <ActivityItem
          activity={a}
          disabled={pickingId !== null || isCombining}
          isPicking={pickingId === a.id}
          isSelected={selected.has(a.id)}
          key={a.id}
          multiSelect={multiSelect}
          onPick={() => onPick(a.id)}
          onToggleSelect={() => onToggleSelect(a.id)}
        />
      ))}
    </ItemGroup>
  );
}

interface ActivityItemProps {
  activity: StravaSummaryActivity;
  disabled: boolean;
  isPicking: boolean;
  isSelected: boolean;
  multiSelect: boolean;
  onPick: () => void;
  onToggleSelect: () => void;
}

function ActivityItem({
  activity,
  disabled,
  isPicking,
  isSelected,
  multiSelect,
  onPick,
  onToggleSelect,
}: ActivityItemProps) {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const duration = formatDuration(activity.moving_time);
  const startLabel = formatDate(activity.start_date);
  const elevation = activity.total_elevation_gain
    ? `${Math.round(activity.total_elevation_gain)} m`
    : null;

  const handleClick = () => {
    if (disabled) {
      return;
    }
    if (multiSelect) {
      onToggleSelect();
    } else {
      onPick();
    }
  };

  return (
    <Item
      aria-label={activity.name}
      data-selected={isSelected ? "true" : undefined}
      onClick={handleClick}
      render={
        <button
          className="cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
          disabled={disabled}
          type="button"
        />
      }
      variant="outline"
    >
      <ItemMedia>
        {multiSelect ? (
          <Checkbox
            aria-label={`Select ${activity.name}`}
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <SportIcon sportType={activity.sport_type} />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{activity.name}</ItemTitle>
        <ItemDescription>
          <span className="font-mono text-[11px] tracking-wide">
            {startLabel} · {distanceKm} km · {duration}
            {elevation ? ` · ${elevation}` : ""}
          </span>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <span className="font-mono text-[10px] tracking-[0.18em] opacity-50">
          {pickAffordance(isPicking, multiSelect)}
        </span>
      </ItemActions>
    </Item>
  );
}

function pickAffordance(isPicking: boolean, multiSelect: boolean): string {
  if (isPicking) {
    return "LOADING…";
  }
  if (multiSelect) {
    return "";
  }
  return "PICK →";
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
