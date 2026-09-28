"use client";

import {
  ArrowRightIcon,
  CircleNotchIcon,
  MapPinIcon,
  PersonSimpleBikeIcon,
  PersonSimpleRunIcon,
  PersonSimpleSwimIcon,
} from "@phosphor-icons/react";
import { Suspense, use, useEffect, useId, useState } from "react";

import { StravaFooter } from "@/components/app/strava-footer";
import {
  fetchActivities,
  fetchDetail,
  fetchTotalPages,
  PER_PAGE,
} from "@/components/app/strava-picker-api";
import type {
  LoadResult,
  StravaFetchError,
  StravaSummaryActivity,
} from "@/components/app/strava-picker-api";
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
import { formatDate, formatDuration } from "@/lib/format";
import type { ParsedActivity } from "@/lib/parse-activity";
import { cn } from "@/lib/utils";

interface StravaPickerProps {
  /** Rendered inside the onboarding wizard's dialog (vs. the full-screen
   * editor-swap surface). Tightens the layout so it sits in a modal. */
  embedded?: boolean;
  onActivityLoaded: (parts: ParsedActivity[]) => void;
  onCancel: () => void;
  onReauth: () => void;
}

/** True when an optional text value actually holds text. */
const hasText = (s: string | null | undefined): s is string =>
  s !== undefined && s !== null && s !== "";

/** Connection status + the central Disconnect control, shown in the picker
 * header. This is the single home for "Connected as … / Disconnect" now that
 * the app chrome no longer carries it. */
const PickerConnection = () => {
  const strava = useStravaConnection();
  if (!strava.connected) {
    return null;
  }
  return (
    <div className="flex shrink-0 items-center gap-2 font-mono text-xs tracking-[0.18em] uppercase opacity-70">
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: "#FC5200" }}
      />
      <span className="hidden sm:inline">
        {hasText(strava.athlete?.firstname)
          ? `Connected as ${strava.athlete.firstname}`
          : "Connected"}
      </span>
      <span aria-hidden className="hidden opacity-50 sm:inline">
        ·
      </span>
      <button
        className="underline-offset-4 hover:underline"
        onClick={() => {
          void strava.disconnect();
        }}
        type="button"
      >
        Disconnect
      </button>
    </div>
  );
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; activities: StravaSummaryActivity[] }
  | { kind: "empty" }
  | { kind: "error"; error: StravaFetchError };

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

/**
 * Build the page-number sequence following the shadcn pattern: always pin
 * page 1 and the last page, show three numbers around the current page,
 * and collapse anything else into ellipses. Short ranges (≤ 7 pages)
 * render every number so the UI doesn't show useless ellipses.
 */
const paginationRange = (page: number, total: number): RangeItem[] => {
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
  for (let p = start; p <= end; p += 1) {
    items.push({ kind: "page", n: p });
  }
  if (end < total - 1) {
    items.push({ kind: "ellipsis", side: "right" });
  }
  items.push({ kind: "page", n: total });
  return items;
};

const PickerPagination = ({
  activityCount,
  onPageChange,
  page,
  show,
  totalPages,
}: PickerPaginationProps) => {
  if (!show) {
    return null;
  }
  // Strava's stats endpoint only counts ride/run/swim, so totalPages can
  // undercount. Trust totalPages when known AND it would block paging,
  // otherwise fall back to the page-is-full heuristic.
  const reachedEndByCount = totalPages !== null && page >= totalPages;
  const canGoNext = activityCount === PER_PAGE && !reachedEndByCount;
  const canGoPrev = page > 1;
  // Until we know the total page count we can't render a meaningful list —
  // fall back to Prev / current / Next so the user can still page forward.
  const range: RangeItem[] | null =
    totalPages === null ? null : paginationRange(page, totalPages);
  return (
    <Pagination className="mt-8 font-mono text-[11px] tracking-[0.18em] uppercase">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={!canGoPrev}
            className={canGoPrev ? "" : "pointer-events-none opacity-40"}
            onClick={() => {
              if (canGoPrev) {
                onPageChange(page - 1);
              }
            }}
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
                  onClick={() => {
                    onPageChange(item.n);
                  }}
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
            onClick={() => {
              if (canGoNext) {
                onPageChange(page + 1);
              }
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

const PickAffordance = ({
  isPicking,
  multiSelect,
}: {
  isPicking: boolean;
  multiSelect: boolean;
}) => {
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
    <span className="flex items-center gap-1 font-mono text-xs tracking-[0.18em] opacity-50">
      PICK
      <ArrowRightIcon aria-hidden className="size-3" weight="duotone" />
    </span>
  );
};

const SportIcon = ({ sportType }: { sportType: string }) => {
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
};

const ActivityItem = ({
  activity,
  disabled,
  isPicking,
  isSelected,
  multiSelect,
  onPick,
  onToggleSelect,
}: ActivityItemProps) => {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const duration = formatDuration(activity.moving_time);
  const startLabel = formatDate(activity.start_date, { month: "short" });
  // No reading, zero, or NaN all mean "no elevation to show".
  const gain = activity.total_elevation_gain ?? 0;
  const elevation =
    gain === 0 || Number.isNaN(gain) ? null : `${Math.round(gain)} m`;

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
        // The label is the Item's aria-label above, which base-ui renders onto
        // this button.
        // oxlint-disable-next-line jsx-a11y/control-has-associated-label
        <button
          className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50"
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
          <span className="font-mono text-xs tracking-wide">
            {startLabel} · {distanceKm} km · {duration}
            {elevation === null ? "" : ` · ${elevation}`}
          </span>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <PickAffordance isPicking={isPicking} multiSelect={multiSelect} />
      </ItemActions>
    </Item>
  );
};

const RateLimitAlert = ({
  className,
  retryAfter,
}: {
  className?: string;
  retryAfter: number;
}) => {
  const [seconds, setSeconds] = useState(retryAfter);
  // Reset + tick the countdown whenever the parent hands us a fresh
  // retryAfter (legit external-prop sync).
  useEffect(() => {
    /* oxlint-disable-next-line react/set-state-in-effect */
    setSeconds(retryAfter);
    const id = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
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
          onClick={() => {
            window.location.reload();
          }}
          size="sm"
          variant="outline"
        >
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
};

/**
 * One Alert component for every Strava failure mode. Each kind gets
 * specific copy + an actionable next step (Retry / Reconnect / Wait)
 * instead of a generic "couldn't reach Strava (NNN)". Rate-limit shows
 * a live countdown so the user knows when Retry will work.
 */
const StravaErrorAlert = ({
  className,
  error,
  onReauth,
}: StravaErrorAlertProps) => {
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
            onClick={() => {
              window.location.reload();
            }}
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
          onClick={() => {
            window.location.reload();
          }}
          size="sm"
          variant="outline"
        >
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
};

const ActivitySkeletons = () => (
  <ItemGroup>
    {SKELETON_KEYS.map((k) => (
      <Skeleton className="h-[72px] w-full" key={`strava-skel-${k}`} />
    ))}
  </ItemGroup>
);

/** Load one page of activities. A lapsed grant hands straight off to the
 *  reconnect flow (the list stays in its loading state meanwhile). */
const loadActivitiesPage = async (
  page: number,
  onReauth: () => void
): Promise<LoadResult> => {
  const result = await fetchActivities(page);
  if (result.kind === "err" && result.error.kind === "reauth") {
    onReauth();
  }
  return result;
};

const toLoadState = (result: LoadResult): LoadState => {
  if (result.kind === "err") {
    return result.error.kind === "reauth"
      ? { kind: "loading" }
      : { error: result.error, kind: "error" };
  }
  return result.activities.length === 0
    ? { kind: "empty" }
    : { activities: result.activities, kind: "ready" };
};

/** Pagination once the lifetime page count has resolved (it is a hint: until
 *  then — or if it fails — the page-is-full heuristic alone gates Next). */
const CountedPagination = ({
  activityCount,
  onPageChange,
  page,
  show,
  totalPagesRequest,
}: {
  activityCount: number;
  onPageChange: (page: number) => void;
  page: number;
  show: boolean;
  totalPagesRequest: Promise<number | null>;
}) => {
  const totalPages = use(totalPagesRequest);
  return (
    <PickerPagination
      activityCount={activityCount}
      onPageChange={onPageChange}
      page={page}
      show={show}
      totalPages={totalPages}
    />
  );
};

/** The fetched page: the list (or its empty / error state), any pick error,
 *  and the pagination. Suspends on `request` — the picker's boundary shows
 *  the loading skeletons meanwhile. */
const ActivityResults = ({
  isCombining,
  multiSelect,
  onPageChange,
  onPick,
  onReauth,
  onToggleSelect,
  page,
  pickError,
  pickingId,
  request,
  selected,
  totalPagesRequest,
}: ActivityResultsProps) => {
  const state = toLoadState(use(request));
  if (state.kind === "loading") {
    return <ActivitySkeletons />;
  }
  const activities = state.kind === "ready" ? state.activities : [];
  const paginationProps = {
    activityCount: activities.length,
    onPageChange,
    page,
    show: state.kind === "ready" || (state.kind === "empty" && page > 1),
  };
  return (
    <>
      <div className="mt-6 flex flex-col">
        {state.kind === "empty" ? (
          <Alert>
            <AlertTitle>No activities on this page.</AlertTitle>
            <AlertDescription>
              {page > 1
                ? "You've reached the end of your activity history."
                : "Record an activity in Strava, then come back."}
            </AlertDescription>
          </Alert>
        ) : null}
        {state.kind === "error" ? (
          <StravaErrorAlert error={state.error} onReauth={onReauth} />
        ) : null}
        {state.kind === "ready" ? (
          <ItemGroup>
            {activities.map((a) => (
              <ActivityItem
                activity={a}
                disabled={pickingId !== null || isCombining}
                isPicking={pickingId === a.id}
                isSelected={selected.has(a.id)}
                key={a.id}
                multiSelect={multiSelect}
                onPick={() => {
                  onPick(a.id);
                }}
                onToggleSelect={() => {
                  onToggleSelect(a.id);
                }}
              />
            ))}
          </ItemGroup>
        ) : null}
      </div>

      {pickError === null ? null : (
        <StravaErrorAlert
          className="mt-4"
          error={pickError}
          onReauth={onReauth}
        />
      )}

      <Suspense
        fallback={<PickerPagination {...paginationProps} totalPages={null} />}
      >
        <CountedPagination
          {...paginationProps}
          totalPagesRequest={totalPagesRequest}
        />
      </Suspense>
    </>
  );
};

/** The sticky "Combine N activities" bar shown while multi-selecting. */
const CombineBar = ({
  embedded,
  isCombining,
  onCombine,
  selectedCount,
}: {
  embedded: boolean;
  isCombining: boolean;
  onCombine: () => void;
  selectedCount: number;
}) => (
  <div
    className={cn(
      "border-foreground/15 bg-background/95 inset-x-0 bottom-0 z-20 border-t px-6 py-4 shadow-lg backdrop-blur md:px-10",
      embedded ? "sticky" : "fixed"
    )}
  >
    <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
      <div className="font-mono text-xs font-medium tracking-wide opacity-80">
        {selectedCount === 1
          ? "Select one more to combine"
          : `${selectedCount} activities selected`}
      </div>
      <Button
        disabled={selectedCount < 2 || isCombining}
        onClick={onCombine}
        size="lg"
      >
        {isCombining ? "Combining…" : `Combine ${selectedCount} activities`}
      </Button>
    </div>
  </div>
);

export const StravaPicker = ({
  embedded = false,
  onActivityLoaded,
  onCancel,
  onReauth,
}: StravaPickerProps) => {
  const [page, setPage] = useState(1);
  // The requests live in state, created by the events that need them (mount,
  // a page change) and read with `use()` under a Suspense boundary — the
  // rendered page is always the latest request's, so a slow earlier page can
  // never overwrite it. The lifetime activity count is a one-shot,
  // best-effort fetch: if it fails we just fall back to the page-is-full
  // heuristic for Next.
  const [requests, setRequests] = useState(() => ({
    page: loadActivitiesPage(1, onReauth),
    totalPages: fetchTotalPages(),
  }));
  const [multiSelect, setMultiSelect] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [pickError, setPickError] = useState<StravaFetchError | null>(null);
  const multiId = useId();

  const handlePageChange = (next: number) => {
    if (next === page) {
      return;
    }
    setPage(next);
    const pageRequest = loadActivitiesPage(next, onReauth);
    setRequests((prev) => ({ ...prev, page: pageRequest }));
  };

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
    const results = await Promise.all(
      ids.map(async (id) => await fetchDetail(id))
    );
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
    if (firstError !== undefined) {
      setPickError(firstError.error);
      return;
    }
    const allParts = results.flatMap((r) => (r.kind === "ok" ? r.parts : []));
    onActivityLoaded(allParts);
  };

  const selectedCount = selected.size;

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        embedded
          ? "px-6 py-6"
          : "mx-auto max-w-2xl flex-1 px-6 pt-20 pb-32 md:px-10 lg:pt-24"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="font-mono text-xs font-medium tracking-[0.32em] opacity-55">
          PICK FROM STRAVA
        </div>
        <PickerConnection />
      </div>
      <h1
        className={cn(
          "font-heading mt-5 leading-[0.92] tracking-tight uppercase",
          embedded ? "text-3xl sm:text-4xl" : "mt-7 text-5xl sm:text-6xl"
        )}
      >
        Your recent <span className="text-primary">efforts.</span>
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed opacity-65">
        Pick one to turn into a card — or flip the switch to combine 2+ into a
        triathlon / multi-sport effort.
      </p>

      <div className="border-foreground/15 mt-8 flex items-center justify-between border-y py-3">
        <Label className="flex items-center gap-3 text-sm" htmlFor={multiId}>
          <Switch
            checked={multiSelect}
            id={multiId}
            onCheckedChange={handleMultiToggle}
          />
          Multi-select
        </Label>
        {multiSelect ? (
          <span className="font-mono text-xs tracking-wide opacity-60">
            {selectedCount} selected
          </span>
        ) : null}
      </div>

      <Suspense
        fallback={
          <div className="mt-6 flex flex-col">
            <ActivitySkeletons />
          </div>
        }
      >
        <ActivityResults
          isCombining={isCombining}
          multiSelect={multiSelect}
          onPageChange={handlePageChange}
          onPick={(id) => {
            void handlePick(id);
          }}
          onReauth={onReauth}
          onToggleSelect={toggleSelect}
          page={page}
          pickError={pickError}
          pickingId={pickingId}
          request={requests.page}
          selected={selected}
          totalPagesRequest={requests.totalPages}
        />
      </Suspense>

      <div className="border-foreground/15 mt-8 flex justify-between border-t pt-6">
        <Button onClick={onCancel} variant="ghost">
          Back
        </Button>
      </div>

      {/* §4 "Compatible with Strava" attribution. The full-screen surface gets
          it from the page chrome; the embedded (in-dialog) picker carries its
          own, since the page footer is inert behind the modal. */}
      {embedded ? <StravaFooter /> : null}

      {multiSelect && selectedCount > 0 ? (
        <CombineBar
          embedded={embedded}
          isCombining={isCombining}
          onCombine={() => {
            void handleCombine();
          }}
          selectedCount={selectedCount}
        />
      ) : null}
    </div>
  );
};

interface PickerPaginationProps {
  /** rows on the current page (a full page suggests there's a next one) */
  activityCount: number;
  onPageChange: (page: number) => void;
  page: number;
  show: boolean;
  totalPages: number | null;
}

type RangeItem =
  | { kind: "page"; n: number }
  | { kind: "ellipsis"; side: "left" | "right" };

interface ActivityResultsProps {
  isCombining: boolean;
  multiSelect: boolean;
  onPageChange: (page: number) => void;
  onPick: (id: number) => void;
  onReauth: () => void;
  onToggleSelect: (id: number) => void;
  page: number;
  pickError: StravaFetchError | null;
  pickingId: number | null;
  request: Promise<LoadResult>;
  selected: Set<number>;
  totalPagesRequest: Promise<number | null>;
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

interface StravaErrorAlertProps {
  className?: string;
  error: StravaFetchError;
  onReauth: () => void;
}
