"use client";

import {
  ArrowRightIcon,
  CircleNotchIcon,
  MapPinIcon,
  PersonSimpleBikeIcon,
  PersonSimpleRunIcon,
  PersonSimpleSwimIcon,
} from "@phosphor-icons/react";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useStravaConnection } from "@/hooks/use-strava-connection";
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

/** Connection status + the central Disconnect control, shown in the picker
 * header. This is the single home for "Connected as … / Disconnect" now that
 * the app chrome no longer carries it. */
function PickerConnection() {
  const strava = useStravaConnection();
  if (!strava.connected) {
    return null;
  }
  return (
    <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: "#FC5200" }}
      />
      <span className="hidden sm:inline">
        {strava.athlete?.firstname
          ? `Connected as ${strava.athlete.firstname}`
          : "Connected"}
      </span>
      <span aria-hidden className="hidden opacity-50 sm:inline">
        ·
      </span>
      <button
        className="underline-offset-4 hover:underline"
        onClick={() => {
          strava.disconnect();
        }}
        type="button"
      >
        Disconnect
      </button>
    </div>
  );
}

/** Discriminated error shape mirrored from `stravaErrorResponse` on the
 * server. Lets the picker show actionable per-kind copy instead of a
 * generic "couldn't reach Strava (NNN)". */
export type StravaFetchError =
  | { kind: "reauth" }
  | { kind: "rate_limited"; retryAfter: number }
  | { kind: "upstream"; status: number }
  | { kind: "network"; message: string }
  | { kind: "empty_activity" };

type LoadResult =
  | { kind: "ok"; activities: StravaSummaryActivity[] }
  | { kind: "err"; error: StravaFetchError };

interface ServerErrorEnvelope {
  error?: string;
  retryAfter?: number;
  status?: number;
}

async function readErrorEnvelope(res: Response): Promise<ServerErrorEnvelope> {
  try {
    return (await res.json()) as ServerErrorEnvelope;
  } catch {
    return {};
  }
}

function toFetchError(
  res: Response,
  envelope: ServerErrorEnvelope
): StravaFetchError {
  if (res.status === 401 || envelope.error === "not_connected") {
    return { kind: "reauth" };
  }
  if (res.status === 429 || envelope.error === "rate_limited") {
    return {
      kind: "rate_limited",
      // Server may compute a fresh retryAfter; fall back to the response
      // header if it didn't set one.
      retryAfter:
        envelope.retryAfter ?? Number(res.headers.get("retry-after")) ?? 60,
    };
  }
  return {
    kind: "upstream",
    status: envelope.status ?? res.status,
  };
}

async function fetchActivities(page: number): Promise<LoadResult> {
  try {
    const res = await fetch(
      `/api/strava/activities?page=${page}&per_page=${PER_PAGE}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return {
        kind: "err",
        error: toFetchError(res, await readErrorEnvelope(res)),
      };
    }
    const data = (await res.json()) as {
      activities: StravaSummaryActivity[];
    };
    return { kind: "ok", activities: data.activities };
  } catch (err) {
    return {
      kind: "err",
      error: {
        kind: "network",
        message: err instanceof Error ? err.message : "Network error.",
      },
    };
  }
}

type DetailResult =
  | { kind: "ok"; parts: ParsedActivity[] }
  | { kind: "err"; error: StravaFetchError };

async function fetchDetail(id: number): Promise<DetailResult> {
  try {
    const res = await fetch(`/api/strava/activity/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        kind: "err",
        error: toFetchError(res, await readErrorEnvelope(res)),
      };
    }
    const data = (await res.json()) as { parts: ParsedActivity[] };
    if (!data.parts?.length) {
      return { kind: "err", error: { kind: "empty_activity" } };
    }
    return { kind: "ok", parts: data.parts };
  } catch (err) {
    return {
      kind: "err",
      error: {
        kind: "network",
        message: err instanceof Error ? err.message : "Network error.",
      },
    };
  }
}

async function fetchTotalPages(): Promise<number | null> {
  // Stats is a hint, not load-bearing — silently fall back to the
  // page-is-full heuristic when it fails (rate-limit or upstream).
  try {
    const res = await fetch("/api/strava/stats", { cache: "no-store" });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { totalPages?: number };
    return typeof data.totalPages === "number" ? data.totalPages : null;
  } catch {
    return null;
  }
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; activities: StravaSummaryActivity[] }
  | { kind: "empty" }
  | { kind: "error"; error: StravaFetchError };

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export function StravaPicker({
  onActivityLoaded,
  onCancel,
  onReauth,
}: StravaPickerProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [pickError, setPickError] = useState<StravaFetchError | null>(null);
  const multiId = useId();

  // One-shot fetch for the lifetime activity count. Best-effort: if it
  // fails we just hide the "of Y" suffix and fall back to canGoNext.
  useEffect(() => {
    let cancelled = false;
    fetchTotalPages().then((tp) => {
      if (!cancelled) {
        setTotalPages(tp);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (result.kind === "err") {
        if (result.error.kind === "reauth") {
          onReauth();
          return;
        }
        setState({ kind: "error", error: result.error });
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
    if (result.kind === "err") {
      if (result.error.kind === "reauth") {
        onReauth();
        return;
      }
      setPickError(result.error);
      return;
    }
    onActivityLoaded(result.parts);
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
    // If any of the parallel fetches expired the grant, jump to reauth so
    // the user doesn't see a confusing per-error message.
    if (results.some((r) => r.kind === "err" && r.error.kind === "reauth")) {
      onReauth();
      return;
    }
    const firstError = results.find(
      (r): r is { kind: "err"; error: StravaFetchError } => r.kind === "err"
    );
    if (firstError) {
      setPickError(firstError.error);
      return;
    }
    const allParts = results.flatMap((r) => (r.kind === "ok" ? r.parts : []));
    onActivityLoaded(allParts);
  };

  const activities = state.kind === "ready" ? state.activities : [];
  // Strava's stats endpoint only counts ride/run/swim, so totalPages can
  // undercount. Trust totalPages when known AND it would block paging,
  // otherwise fall back to the page-is-full heuristic.
  const reachedEndByCount = totalPages !== null && page >= totalPages;
  const canGoNext = activities.length === PER_PAGE && !reachedEndByCount;
  const canGoPrev = page > 1;
  const selectedCount = selected.size;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pt-20 pb-32 md:px-10 lg:pt-24">
      <div className="flex items-center justify-between gap-4">
        <div className="font-medium font-mono text-xs tracking-[0.32em] opacity-55">
          STEP 02 / 03 · PICK FROM STRAVA
        </div>
        <PickerConnection />
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
        <StravaErrorAlert
          className="mt-4"
          error={pickError}
          onReauth={onReauth}
        />
      ) : null}

      <PickerPagination
        canGoNext={canGoNext}
        canGoPrev={canGoPrev}
        onPageChange={setPage}
        page={page}
        show={state.kind === "ready" || (state.kind === "empty" && page > 1)}
        totalPages={totalPages}
      />

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

interface PickerPaginationProps {
  canGoNext: boolean;
  canGoPrev: boolean;
  onPageChange: (updater: (p: number) => number) => void;
  page: number;
  show: boolean;
  totalPages: number | null;
}

type RangeItem =
  | { kind: "page"; n: number }
  | { kind: "ellipsis"; side: "left" | "right" };

/**
 * Build the page-number sequence following the shadcn pattern: always pin
 * page 1 and the last page, show three numbers around the current page,
 * and collapse anything else into ellipses. Short ranges (≤ 7 pages)
 * render every number so the UI doesn't show useless ellipses.
 */
function paginationRange(page: number, total: number): RangeItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({
      kind: "page" as const,
      n: i + 1,
    }));
  }
  const items: RangeItem[] = [{ kind: "page", n: 1 }];
  let start: number;
  let end: number;
  if (page <= 3) {
    start = 2;
    end = 4;
  } else if (page >= total - 2) {
    start = total - 3;
    end = total - 1;
  } else {
    start = page - 1;
    end = page + 1;
  }
  if (start > 2) {
    items.push({ kind: "ellipsis", side: "left" });
  }
  for (let p = start; p <= end; p++) {
    items.push({ kind: "page", n: p });
  }
  if (end < total - 1) {
    items.push({ kind: "ellipsis", side: "right" });
  }
  items.push({ kind: "page", n: total });
  return items;
}

function PickerPagination({
  canGoNext,
  canGoPrev,
  onPageChange,
  page,
  show,
  totalPages,
}: PickerPaginationProps) {
  if (!show) {
    return null;
  }
  // Until we know the total page count we can't render a meaningful list —
  // fall back to Prev / current / Next so the user can still page forward.
  const range: RangeItem[] | null =
    totalPages === null ? null : paginationRange(page, totalPages);
  return (
    <Pagination className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em]">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={!canGoPrev}
            className={canGoPrev ? "" : "pointer-events-none opacity-40"}
            onClick={() => canGoPrev && onPageChange((p) => p - 1)}
          />
        </PaginationItem>
        {range ? (
          range.map((item) =>
            item.kind === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${item.side}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={`page-${item.n}`}>
                <PaginationLink
                  isActive={item.n === page}
                  onClick={() => onPageChange(() => item.n)}
                >
                  {item.n}
                </PaginationLink>
              </PaginationItem>
            )
          )
        ) : (
          <PaginationItem>
            <PaginationLink isActive>{page}</PaginationLink>
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationNext
            aria-disabled={!canGoNext}
            className={canGoNext ? "" : "pointer-events-none opacity-40"}
            onClick={() => canGoNext && onPageChange((p) => p + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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
    return <StravaErrorAlert error={state.error} onReauth={onReauth} />;
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
        <div className="flex items-center gap-3">
          {multiSelect ? (
            // Click on the checkbox bubbles to the outer <button> which
            // toggles the row — make the checkbox itself non-interactive
            // so we don't double-fire and so focus stays on the row.
            <Checkbox
              aria-hidden
              checked={isSelected}
              className="pointer-events-none"
              tabIndex={-1}
            />
          ) : null}
          <SportIcon sportType={activity.sport_type} />
        </div>
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
        <PickAffordance isPicking={isPicking} multiSelect={multiSelect} />
      </ItemActions>
    </Item>
  );
}

function PickAffordance({
  isPicking,
  multiSelect,
}: {
  isPicking: boolean;
  multiSelect: boolean;
}) {
  if (isPicking) {
    return (
      <CircleNotchIcon
        aria-label="Loading"
        className="size-4 animate-spin opacity-60"
        weight="duotone"
      />
    );
  }
  if (multiSelect) {
    return null;
  }
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] opacity-50">
      PICK
      <ArrowRightIcon aria-hidden className="size-3" weight="duotone" />
    </span>
  );
}

function SportIcon({ sportType }: { sportType: string }) {
  const s = sportType.toLowerCase();
  const cls = "size-5 shrink-0 opacity-70";
  if (s.includes("swim")) {
    return (
      <PersonSimpleSwimIcon
        aria-hidden
        className={cls}
        data-sport="swim"
        weight="duotone"
      />
    );
  }
  if (s.includes("ride") || s.includes("bike") || s.includes("cycl")) {
    return (
      <PersonSimpleBikeIcon
        aria-hidden
        className={cls}
        data-sport="ride"
        weight="duotone"
      />
    );
  }
  if (s.includes("run")) {
    return (
      <PersonSimpleRunIcon
        aria-hidden
        className={cls}
        data-sport="run"
        weight="duotone"
      />
    );
  }
  return (
    <MapPinIcon
      aria-hidden
      className={cls}
      data-sport="other"
      weight="duotone"
    />
  );
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

interface StravaErrorAlertProps {
  className?: string;
  error: StravaFetchError;
  onReauth: () => void;
}

/**
 * One Alert component for every Strava failure mode. Each kind gets
 * specific copy + an actionable next step (Retry / Reconnect / Wait)
 * instead of a generic "couldn't reach Strava (NNN)". Rate-limit shows
 * a live countdown so the user knows when Retry will work.
 */
function StravaErrorAlert({
  className,
  error,
  onReauth,
}: StravaErrorAlertProps) {
  if (error.kind === "reauth") {
    return (
      <Alert className={className} variant="destructive">
        <AlertTitle>Your Strava sign-in expired</AlertTitle>
        <AlertDescription>
          <p>Reconnect to keep browsing your activities.</p>
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
  if (error.kind === "rate_limited") {
    return (
      <RateLimitAlert className={className} retryAfter={error.retryAfter} />
    );
  }
  if (error.kind === "upstream") {
    return (
      <Alert className={className} variant="destructive">
        <AlertTitle>Strava had a hiccup</AlertTitle>
        <AlertDescription>
          <p>HTTP {error.status} from Strava. Try again in a moment.</p>
          <Button
            className="mt-3"
            onClick={() => window.location.reload()}
            size="sm"
            variant="outline"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (error.kind === "empty_activity") {
    return (
      <Alert className={className} variant="destructive">
        <AlertTitle>Nothing to render here</AlertTitle>
        <AlertDescription>
          This Strava activity has no data we can turn into a card (no GPS and
          no session summary).
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert className={className} variant="destructive">
      <AlertTitle>Can&apos;t reach the server</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        <Button
          className="mt-3"
          onClick={() => window.location.reload()}
          size="sm"
          variant="outline"
        >
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function RateLimitAlert({
  className,
  retryAfter,
}: {
  className?: string;
  retryAfter: number;
}) {
  const [seconds, setSeconds] = useState(retryAfter);
  // Reset + tick the countdown whenever the parent hands us a fresh
  // retryAfter (legit external-prop sync).
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setSeconds(retryAfter);
    const id = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryAfter]);
  return (
    <Alert className={className} variant="destructive">
      <AlertTitle>Strava is rate-limiting us</AlertTitle>
      <AlertDescription>
        <p>
          We hit Strava&apos;s 15-minute request quota. Try again in{" "}
          <span className="font-mono">{seconds}s</span>.
        </p>
        <Button
          className="mt-3"
          disabled={seconds > 0}
          onClick={() => window.location.reload()}
          size="sm"
          variant="outline"
        >
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
