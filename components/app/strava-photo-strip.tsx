"use client";

// The "Images from Strava" thumbnail row. Pure presentation: the caller
// decides what a click means (the wizard stages the ref; the editor fetches
// the full-size file immediately). Previews render straight off Strava's CDN
// (`<Image unoptimized>` — display only, never exported); activation goes
// through `/api/strava/photo` so the export canvas stays untainted.

import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import type { StravaPhotoRef } from "@/lib/activity";
import { stravaPhotoKey } from "@/lib/strava-photos";
import { cn } from "@/lib/utils";

interface StravaPhotoStripProps {
  onPick: (ref: StravaPhotoRef) => void;
  photos: StravaPhotoRef[];
  /** key (`stravaPhotoKey`) of the thumb currently downloading, if any */
  pickingKey?: string | null;
  /** key (`stravaPhotoKey`) of the currently active photo, if any */
  selectedKey?: string | null;
}

export function StravaPhotoStrip({
  onPick,
  photos,
  pickingKey = null,
  selectedKey = null,
}: StravaPhotoStripProps) {
  if (photos.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((ref) => {
        const key = stravaPhotoKey(ref);
        const selected = key === selectedKey;
        const picking = key === pickingKey;
        return (
          <button
            aria-label={`Use Strava photo ${ref.index + 1}`}
            aria-pressed={selected}
            className={cn(
              "relative h-14 w-20 overflow-hidden outline outline-1 outline-foreground/20 transition-all hover:outline-2 hover:outline-primary",
              selected && "outline-2 outline-primary"
            )}
            disabled={picking}
            key={key}
            onClick={() => onPick(ref)}
            type="button"
          >
            <Image
              alt={`Strava photo ${ref.index + 1}`}
              className="object-cover"
              fill
              sizes="80px"
              src={ref.previewUrl}
              unoptimized
            />
            {picking ? (
              <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Spinner className="size-4" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
