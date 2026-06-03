"use client";

// The control sidebar shared by both the Single Card and Carousel editors: the
// loaded-file row + Swap control at the top, the Strava connection row (when the
// activity came from Strava), the mode-specific controls in the middle (passed
// as children — usually <ActivityControls/>), and the download/export action
// button at the bottom. Keeping the shell here means the two editors share the
// same header, spacing, Strava affordances and CTA.

import { ArrowRightIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStravaConnection } from "@/hooks/use-strava-connection";
import { formatDate } from "@/lib/format";
import { type ParsedActivity, parseActivityFile } from "@/lib/parse-activity";
import type { ActivityData } from "./sample-data";

const ACTIVITY_FILE_RE = /\.(gpx|fit)$/i;

interface EditSidebarProps {
  /** optional duotone icon rendered before the action label */
  actionIcon?: React.ReactNode;
  /** big primary label, e.g. "Download PNG" / "Export carousel" */
  actionLabel: string;
  /** small mono sub-label, e.g. "1080 × 1350" / "4 × 1080×1350" */
  actionMeta: string;
  children: React.ReactNode;
  data: ActivityData;
  isBusy: boolean;
  onAction: () => void;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  /** open the Strava picker (Swap uses it for Strava-sourced activities) */
  onOpenStravaPicker: () => void;
}

export function EditSidebar({
  data,
  onFilesLoaded,
  onOpenStravaPicker,
  actionIcon,
  actionLabel,
  actionMeta,
  isBusy,
  onAction,
  children,
}: EditSidebarProps) {
  return (
    <div className="flex flex-col gap-7 pr-2 lg:pr-10">
      <FileLoadedRow
        data={data}
        onFilesLoaded={onFilesLoaded}
        onOpenStravaPicker={onOpenStravaPicker}
      />
      <StravaConnectionRow data={data} />

      {children}

      <Button
        className="mt-4 h-auto justify-between py-4 font-heading text-lg"
        disabled={isBusy}
        onClick={onAction}
        size="lg"
      >
        <span className="flex items-center gap-2.5">
          {actionIcon}
          {isBusy ? "Rendering…" : actionLabel}
        </span>
        <span className="font-medium font-mono text-[10px] tracking-[0.18em] opacity-75">
          {actionMeta}
        </span>
      </Button>
    </div>
  );
}

function FileLoadedRow({
  data,
  onFilesLoaded,
  onOpenStravaPicker,
}: {
  data: ActivityData;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onOpenStravaPicker: () => void;
}) {
  const fromStrava = data.source === "strava";
  const segCount = data.segments?.length ?? 0;
  const isMulti = data.sport === "triathlon" && segCount >= 2;
  const friendlyDate = formatDate(data.date);
  const slug = friendlyDate.replace(/\s|,/g, "").toLowerCase() || "activity";
  // Strava users never see a `.fit` filename, so don't pretend. For uploads we
  // keep the file-like label that mirrors what the user dropped in.
  let label: string;
  if (fromStrava) {
    label = isMulti
      ? `Strava · ${segCount} activities combined`
      : `Strava · ${data.title || data.sport}`;
  } else if (isMulti) {
    label = `${segCount} files · assembled`;
  } else {
    label = `${data.sport}_${slug}.fit`;
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList).filter((f) =>
      ACTIVITY_FILE_RE.test(f.name)
    );
    if (!files.length) {
      setError("Drop a .gpx or .fit file.");
      return;
    }
    setError(null);
    setIsSwapping(true);
    try {
      const parts = await Promise.all(files.map((f) => parseActivityFile(f)));
      onFilesLoaded(parts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = () => {
    if (fromStrava) {
      onOpenStravaPicker();
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-medium font-mono text-[11px] opacity-60">
        <div aria-hidden className="size-1.5 rounded-full bg-primary" />
        <span className="truncate">{isSwapping ? "Reading…" : label}</span>
        <input
          accept=".gpx,.fit"
          className="hidden"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <button
          className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50"
          disabled={isSwapping}
          onClick={handleSwap}
          type="button"
        >
          Swap
          <ArrowRightIcon aria-hidden className="size-2.5" weight="duotone" />
        </button>
      </div>
      {error ? (
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-destructive">
          <WarningCircleIcon
            aria-hidden
            className="size-3.5"
            weight="duotone"
          />
          {error}
        </div>
      ) : null}
    </div>
  );
}

function StravaConnectionRow({ data }: { data: ActivityData }) {
  const strava = useStravaConnection();
  // Disconnect itself lives in the app-wide footer (single source of truth);
  // this row exists only when the loaded activity came from Strava and needs
  // the "View on Strava" link(s). Hide otherwise.
  if (!strava.connected || data.source !== "strava") {
    return null;
  }
  return (
    <div className="-mt-3 flex flex-col gap-1.5 border-foreground/10 border-b pb-3 font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: "#FC5200" }}
        />
        <span>
          STRAVA
          {strava.athlete?.firstname ? ` · ${strava.athlete.firstname}` : ""}
          <span className="ml-1 opacity-70">· this activity</span>
        </span>
      </div>
      <ViewOnStravaLinks data={data} />
    </div>
  );
}

/**
 * Renders one or more "View on Strava" anchors per Strava brand guidelines §3
 * (font-weight 700, underline, brand orange `#FC5200`). Single Strava activity
 * → one link. Combined triathlon with segment-aligned ids → one link per
 * Strava-sourced segment, labelled by sport. Mixed-source triathlons render
 * only the Strava-backed segments. Renders nothing if `stravaActivityIds` is
 * absent.
 */
function ViewOnStravaLinks({ data }: { data: ActivityData }) {
  const ids = data.stravaActivityIds;
  if (!ids?.length) {
    return null;
  }
  if (ids.length === 1 && ids[0] !== null) {
    return (
      <a
        className="font-bold text-[#FC5200] underline-offset-4 hover:underline"
        href={`https://www.strava.com/activities/${ids[0]}/overview`}
        rel="noopener noreferrer"
        target="_blank"
      >
        View on Strava ↗
      </a>
    );
  }
  // Triathlon — pair ids with segments by index so we can label per sport.
  // `null` slots are file-sourced segments; they're skipped silently.
  const segments = data.segments ?? [];
  const links = ids
    .map((id, i) => ({ id, sport: segments[i]?.sport }))
    .filter(
      (x): x is { id: number; sport: NonNullable<typeof x.sport> } =>
        x.id !== null && x.sport !== undefined
    );
  if (links.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>View on Strava:</span>
      {links.map(({ id, sport }, i) => (
        <span key={id}>
          <a
            className="font-bold text-[#FC5200] underline-offset-4 hover:underline"
            href={`https://www.strava.com/activities/${id}/overview`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {sport.toUpperCase()}
          </a>
          {i < links.length - 1 ? <span aria-hidden> ·</span> : null}
        </span>
      ))}
    </div>
  );
}
