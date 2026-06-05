"use client";

// The activity-provenance controls shown at the top of the ACTIVITY section:
// the source (Strava / uploaded file), a "View on Strava" link where relevant,
// Swap (re-pick or re-upload), and Disconnect when a Strava account is linked.
// Lives inline in the controls now — there's no separate chip/overlay — so the
// editor's top bar stays free for the preview.

import {
  ArrowSquareOutIcon,
  SwapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStravaConnection } from "@/hooks/use-strava-connection";
import { formatDate } from "@/lib/format";
import { type ParsedActivity, parseActivityFiles } from "@/lib/parse-activity";
import type { ActivityData } from "./sample-data";

interface ActivitySourceProps {
  data: ActivityData;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onOpenStravaPicker: () => void;
}

export function ActivitySource({
  data,
  onFilesLoaded,
  onOpenStravaPicker,
}: ActivitySourceProps) {
  const strava = useStravaConnection();
  const fromStrava = data.source === "strava";
  const segCount = data.segments?.length ?? 0;
  const isMulti = data.sport === "triathlon" && segCount >= 2;
  const friendlyDate = formatDate(data.date);
  const slug = friendlyDate.replace(/\s|,/g, "").toLowerCase() || "activity";

  // One Strava mention in the source line. Uploads show a file-style label.
  let sourceLabel: string;
  if (fromStrava) {
    sourceLabel = isMulti
      ? `Strava · ${segCount} activities combined`
      : `Strava${strava.athlete?.firstname ? ` · ${strava.athlete.firstname}` : ""}`;
  } else if (isMulti) {
    sourceLabel = `${segCount} files · assembled`;
  } else {
    sourceLabel = `${data.sport}_${slug}.fit`;
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) {
      return;
    }
    setError(null);
    setIsSwapping(true);
    try {
      onFilesLoaded(await parseActivityFiles(fileList));
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
    <div className="mt-2 flex flex-col gap-3">
      <div className="caption-micro flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: fromStrava ? "#FC5200" : "var(--primary)" }}
        />
        {isSwapping ? "Reading…" : sourceLabel}
      </div>

      {fromStrava ? <ViewOnStravaLinks data={data} /> : null}

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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={isSwapping}
          onClick={handleSwap}
          size="sm"
          type="button"
          variant="outline"
        >
          <SwapIcon aria-hidden className="size-4" weight="duotone" />
          {fromStrava ? "Swap — pick another" : "Swap — upload another"}
        </Button>
        {strava.connected ? (
          <Button
            onClick={() => {
              strava.disconnect();
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Disconnect Strava
          </Button>
        ) : null}
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

/**
 * "View on Strava" anchors per Strava brand guidelines §3 (weight 700,
 * underline, brand orange `#FC5200`). Single activity → one link; a combined
 * triathlon with segment-aligned ids → one labelled link per Strava segment.
 */
function ViewOnStravaLinks({ data }: { data: ActivityData }) {
  const ids = data.stravaActivityIds;
  if (!ids?.length) {
    return null;
  }
  if (ids.length === 1 && ids[0] !== null) {
    return (
      <a
        className="inline-flex items-center gap-1 font-bold font-mono text-[#FC5200] text-[11px] uppercase tracking-[0.14em] underline-offset-4 hover:underline"
        href={`https://www.strava.com/activities/${ids[0]}/overview`}
        rel="noopener noreferrer"
        target="_blank"
      >
        View on Strava
        <ArrowSquareOutIcon aria-hidden className="size-3" weight="duotone" />
      </a>
    );
  }
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
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
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
