"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ImageIcon,
  MapTrifoldIcon,
  XIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EffortMark } from "@/components/app/effort-wordmark";
import {
  type ActivityData,
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
} from "@/components/app/sample-data";
import { StravaConnectButton } from "@/components/app/strava-connect-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  type UseStravaConnection,
  useStravaConnection,
} from "@/hooks/use-strava-connection";
import { formatDuration, formatNumber } from "@/lib/format";
import { type ParsedActivity, parseActivityFiles } from "@/lib/parse-activity";
import { cn } from "@/lib/utils";

/** What the wizard hands back when the user opens the editor. Exactly one of
 * `parts` (uploaded files) or `sample` (a built-in fixture) is set. */
export interface OnboardingResult {
  parts?: ParsedActivity[];
  photo: File | null;
  sample?: ActivityData;
}

interface OnboardingWizardProps {
  onComplete: (result: OnboardingResult) => void;
  onOpenChange: (open: boolean) => void;
  /** Hand off to the existing full-screen Strava picker (connected path). */
  onOpenStravaPicker: () => void;
  open: boolean;
}

// The activity, once chosen: either parsed upload(s) or a built-in sample.
type WizardActivity =
  | {
      kind: "file";
      label: string;
      meta: string;
      name: string;
      parts: ParsedActivity[];
    }
  | { kind: "sample"; data: ActivityData; label: string; meta: string };

// The background photo: an uploaded File (object URL) or a bundled sample (path).
type WizardPhoto =
  | { kind: "upload"; file: File; name: string; url: string }
  | { kind: "sample"; name: string; url: string };

const SAMPLES = [
  { data: SAMPLE_RIDE, sport: "ride" },
  { data: SAMPLE_RUN, sport: "run" },
  { data: SAMPLE_SWIM, sport: "swim" },
] as const;

const SAMPLE_PHOTOS = [
  { name: "alpine-gravel.jpg", url: "/images/ride.jpg" },
  { name: "north-sea-dusk.webp", url: "/images/dunes.webp" },
] as const;

function activityMeta(a: {
  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;
}): string {
  const parts = [`${formatNumber(a.distanceKm, 1)} km`];
  if (a.elevationGainM) {
    parts.push(`${formatNumber(a.elevationGainM)} m`);
  }
  parts.push(formatDuration(a.durationSec));
  return parts.join(" · ");
}

// Sample photos live in /public; fetch one back into a File so it flows through
// the same File-based photo pipeline the editor already uses for uploads.
async function urlToFile(url: string, name: string): Promise<File> {
  const blob = await fetch(url).then((r) => r.blob());
  return new File([blob], name, { type: blob.type });
}

function footerNote(
  hasActivity: boolean,
  hasPhoto: boolean
): { hint: string; kicker: string } {
  if (!hasActivity) {
    return {
      kicker: "Start with an activity",
      hint: "Add an activity to continue — the photo is optional.",
    };
  }
  if (hasPhoto) {
    return {
      kicker: "All set",
      hint: "You can keep refining everything in the editor.",
    };
  }
  return {
    kicker: "Photo is optional",
    hint: "You can still add a photo inside the editor.",
  };
}

function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="caption-micro">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function StepHeader({
  badge,
  badgeClass,
  num,
  numClass,
  title,
}: {
  badge: string;
  badgeClass: string;
  num: string;
  numClass?: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={cn("font-heading text-xl leading-none", numClass)}>
        {num}
      </span>
      <h3 className="font-heading text-lg uppercase leading-none">{title}</h3>
      <Badge className={cn("px-2 py-1", badgeClass)}>{badge}</Badge>
    </div>
  );
}

function DropZone({
  cta,
  dragging,
  hint,
  icon,
  onBrowse,
  onDragStateChange,
  onFiles,
  parsing,
}: {
  cta: string;
  dragging: boolean;
  hint: React.ReactNode;
  icon: React.ReactNode;
  onBrowse: () => void;
  onDragStateChange: (dragging: boolean) => void;
  onFiles: (files: FileList) => void;
  parsing?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex flex-col items-center gap-3 border border-foreground/30 border-dashed bg-foreground/[0.015] px-4 py-6 text-center transition-colors hover:border-primary hover:bg-primary/5",
        dragging && "border-primary bg-primary/5"
      )}
      onClick={onBrowse}
      onDragLeave={(e) => {
        e.preventDefault();
        onDragStateChange(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragStateChange(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDragStateChange(false);
        if (e.dataTransfer.files.length) {
          onFiles(e.dataTransfer.files);
        }
      }}
      type="button"
    >
      {parsing ? <Spinner className="size-9 text-primary" /> : icon}
      <span className="text-muted-foreground text-sm">{hint}</span>
      <span className="inline-flex h-9 items-center bg-foreground px-5 font-heading text-background text-sm uppercase tracking-wide">
        {cta}
      </span>
    </button>
  );
}

function LoadedRow({
  kicker,
  name,
  onRemove,
  onReplace,
  replaceLabel,
  sub,
  thumb,
}: {
  kicker: string;
  name: string;
  onRemove: () => void;
  onReplace: () => void;
  replaceLabel: string;
  sub?: string;
  thumb?: string;
}) {
  return (
    <>
      <div className="flex items-stretch overflow-hidden bg-foreground text-background">
        {thumb ? (
          <div
            className="w-24 shrink-0 bg-center bg-cover"
            style={{ backgroundImage: `url(${thumb})` }}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
          <span className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <CheckIcon className="size-4" weight="bold" />
          </span>
          <div className="min-w-0">
            <div className="caption-micro text-background/60">{kicker}</div>
            <div className="truncate font-mono text-sm">{name}</div>
            {sub ? (
              <div className="truncate text-background/70 text-xs">{sub}</div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        <Button onClick={onReplace} size="xs" variant="link">
          {replaceLabel}
        </Button>
        <Button onClick={onRemove} size="xs" variant="link">
          Remove
        </Button>
      </div>
    </>
  );
}

// STEP 1 — activity (required). Shows a drop zone + Strava + samples, or a
// loaded confirmation once an activity is chosen.
function ActivityStep({
  activity,
  dragging,
  onBrowse,
  onDragStateChange,
  onFiles,
  onLoadSample,
  onOpenStravaPicker,
  onRemove,
  parsing,
  strava,
}: {
  activity: WizardActivity | null;
  dragging: boolean;
  onBrowse: () => void;
  onDragStateChange: (dragging: boolean) => void;
  onFiles: (files: FileList) => void;
  onLoadSample: (data: ActivityData) => void;
  onOpenStravaPicker: () => void;
  onRemove: () => void;
  parsing: boolean;
  strava: UseStravaConnection;
}) {
  return (
    <div className="flex flex-col border border-border bg-card p-5">
      <StepHeader
        badge="Required"
        badgeClass="bg-foreground text-background"
        num="01"
        title="Add your activity"
      />
      {activity ? (
        <LoadedRow
          kicker={activity.kind === "sample" ? "Sample loaded" : "File loaded"}
          name={activity.kind === "file" ? activity.name : activity.label}
          onRemove={onRemove}
          onReplace={onBrowse}
          replaceLabel="Swap file"
          sub={
            activity.kind === "file"
              ? `${activity.label} · ${activity.meta}`
              : activity.meta
          }
        />
      ) : (
        <>
          <DropZone
            cta="Browse files"
            dragging={dragging}
            hint={
              <>
                Drop a{" "}
                <span className="font-semibold text-foreground">.gpx</span> or{" "}
                <span className="font-semibold text-foreground">.fit</span> file
              </>
            }
            icon={
              <MapTrifoldIcon
                className="size-9 text-foreground"
                weight="duotone"
              />
            }
            onBrowse={onBrowse}
            onDragStateChange={onDragStateChange}
            onFiles={onFiles}
            parsing={parsing}
          />
          <OrDivider />
          {strava.connected ? (
            <Button
              className="self-start"
              onClick={onOpenStravaPicker}
              variant="outline"
            >
              Pick from Strava
              {strava.athlete?.firstname
                ? ` · ${strava.athlete.firstname}`
                : ""}
            </Button>
          ) : (
            <StravaConnectButton className="self-start" />
          )}
          <p className="caption-micro mt-3">
            {strava.connected
              ? "Connected"
              : "OAuth · Read-only · Revoke anytime"}
          </p>
          <OrDivider />
          <div className="flex flex-wrap items-center gap-2">
            <span className="caption-micro">Try a sample</span>
            {SAMPLES.map(({ data, sport }) => (
              <Button
                className="px-3"
                key={sport}
                onClick={() => onLoadSample(data)}
                size="xs"
                variant="outline"
              >
                {sport}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// STEP 2 — photo (recommended, optional). Drop zone + sample thumbs + skip, a
// loaded thumbnail, or a quiet "skipped" notice.
function PhotoStepBody({
  dragging,
  onBrowse,
  onChooseSample,
  onDragStateChange,
  onFiles,
  onRemove,
  onSkip,
  onUnskip,
  photo,
  photoSkipped,
}: {
  dragging: boolean;
  onBrowse: () => void;
  onChooseSample: (url: string, name: string) => void;
  onDragStateChange: (dragging: boolean) => void;
  onFiles: (files: FileList) => void;
  onRemove: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  photo: WizardPhoto | null;
  photoSkipped: boolean;
}) {
  if (photo) {
    return (
      <LoadedRow
        kicker="Photo added"
        name={photo.name}
        onRemove={onRemove}
        onReplace={onBrowse}
        replaceLabel="Replace"
        thumb={photo.url}
      />
    );
  }
  if (photoSkipped) {
    return (
      <div className="flex items-center gap-3 border border-border bg-muted/40 p-4">
        <span className="flex-1 text-muted-foreground text-sm">
          No photo for now — you can add one anytime in the editor.
        </span>
        <Button onClick={onUnskip} size="xs" variant="link">
          Add one
        </Button>
      </div>
    );
  }
  return (
    <>
      <DropZone
        cta="Browse photos"
        dragging={dragging}
        hint="Drop a photo"
        icon={<ImageIcon className="size-9 text-foreground" weight="duotone" />}
        onBrowse={onBrowse}
        onDragStateChange={onDragStateChange}
        onFiles={onFiles}
      />
      <OrDivider />
      <div className="flex flex-wrap items-center gap-3">
        <span className="caption-micro">Try a sample</span>
        <div className="flex gap-2">
          {SAMPLE_PHOTOS.map((p) => (
            <button
              className="relative h-14 w-20 overflow-hidden outline outline-1 outline-foreground/20 transition-all hover:outline-2 hover:outline-primary"
              key={p.url}
              onClick={() => onChooseSample(p.url, p.name)}
              type="button"
            >
              <Image
                alt={p.name}
                className="object-cover"
                fill
                sizes="80px"
                src={p.url}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={onSkip} size="xs" variant="link">
          Skip for now
        </Button>
      </div>
    </>
  );
}

function PhotoStep(props: React.ComponentProps<typeof PhotoStepBody>) {
  return (
    <div className="flex flex-col border border-primary/40 bg-card p-5 ring-1 ring-primary/15 ring-inset">
      <StepHeader
        badge="Recommended"
        badgeClass="bg-primary text-primary-foreground"
        num="02"
        numClass="text-primary"
        title="Add a background photo"
      />
      <p className="mb-4 text-muted-foreground text-sm">
        A real photo makes the card unmistakably{" "}
        <span className="font-semibold text-foreground">yours</span>.
      </p>
      <PhotoStepBody {...props} />
    </div>
  );
}

export function OnboardingWizard({
  onComplete,
  onOpenChange,
  onOpenStravaPicker,
  open,
}: OnboardingWizardProps) {
  const strava = useStravaConnection();
  const [activity, setActivity] = useState<WizardActivity | null>(null);
  const [photo, setPhoto] = useState<WizardPhoto | null>(null);
  const [photoSkipped, setPhotoSkipped] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [dragTarget, setDragTarget] = useState<"activity" | "photo" | null>(
    null
  );
  const activityInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Revoke an uploaded photo's object URL when it's replaced or the wizard
  // unmounts. Sample photos use a static /public path, so they're left alone.
  useEffect(() => {
    if (photo?.kind !== "upload") {
      return;
    }
    const { url } = photo;
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const loadFiles = async (files: FileList) => {
    if (parsing) {
      return;
    }
    setParsing(true);
    try {
      const parts = await parseActivityFiles(files);
      const list = Array.from(files);
      setActivity({
        kind: "file",
        parts,
        name: list.length === 1 ? list[0].name : `${list.length} files`,
        label: parts[0].title,
        meta: activityMeta(parts[0]),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setParsing(false);
    }
  };

  const loadSample = (data: ActivityData) => {
    setActivity({
      kind: "sample",
      data,
      label: data.title,
      meta: activityMeta(data),
    });
  };

  const choosePhoto = (file: File) => {
    setPhoto({
      kind: "upload",
      file,
      name: file.name,
      url: URL.createObjectURL(file),
    });
    setPhotoSkipped(false);
  };

  const chooseSamplePhoto = (url: string, name: string) => {
    setPhoto({ kind: "sample", name, url });
    setPhotoSkipped(false);
  };

  const finish = async () => {
    if (!activity) {
      return;
    }
    let photoFile: File | null = null;
    if (photo?.kind === "upload") {
      photoFile = photo.file;
    } else if (photo?.kind === "sample") {
      try {
        photoFile = await urlToFile(photo.url, photo.name);
      } catch {
        photoFile = null;
      }
    }
    onComplete(
      activity.kind === "file"
        ? { parts: activity.parts, photo: photoFile }
        : { sample: activity.data, photo: photoFile }
    );
  };

  const done = (activity ? 1 : 0) + (photo ? 1 : 0);
  const note = footerNote(Boolean(activity), Boolean(photo));

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex max-h-[92dvh] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-foreground border-t-4 bg-background p-0 sm:max-h-[88vh] sm:max-w-[60rem]"
        showCloseButton={false}
      >
        <input
          accept=".gpx,.fit"
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) {
              loadFiles(e.target.files);
            }
            e.target.value = "";
          }}
          ref={activityInputRef}
          type="file"
        />
        <input
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              choosePhoto(file);
            }
            e.target.value = "";
          }}
          ref={photoInputRef}
          type="file"
        />

        {/* Header — left-aligned brand + title, progress + close top-right. */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 sm:px-8">
          <div className="flex flex-col gap-2">
            <span className="caption-micro flex items-center gap-2">
              <EffortMark className="size-4" /> Welcome to Effort
            </span>
            <DialogTitle className="text-2xl sm:text-3xl">
              Two steps to your card
            </DialogTitle>
            <DialogDescription className="max-w-md">
              Bring in an activity, drop a photo behind it, then make it yours
              in the editor.
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="caption-micro whitespace-nowrap">{done} / 2</span>
            <DialogClose render={<Button size="icon-sm" variant="outline" />}>
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </div>

        {/* Body — both steps at once: side-by-side on desktop, stacked on touch. */}
        <div className="grid flex-1 grid-cols-1 items-stretch gap-4 overflow-y-auto px-6 pb-2 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:gap-0">
          <ActivityStep
            activity={activity}
            dragging={dragTarget === "activity"}
            onBrowse={() => activityInputRef.current?.click()}
            onDragStateChange={(d) => setDragTarget(d ? "activity" : null)}
            onFiles={loadFiles}
            onLoadSample={loadSample}
            onOpenStravaPicker={onOpenStravaPicker}
            onRemove={() => setActivity(null)}
            parsing={parsing}
            strava={strava}
          />

          {/* Connector — points right between cards, down when stacked. */}
          <div className="flex items-center justify-center text-muted-foreground md:px-3">
            <ArrowRightIcon className="size-5 rotate-90 md:rotate-0" />
          </div>

          <PhotoStep
            dragging={dragTarget === "photo"}
            onBrowse={() => photoInputRef.current?.click()}
            onChooseSample={chooseSamplePhoto}
            onDragStateChange={(d) => setDragTarget(d ? "photo" : null)}
            onFiles={(files) => {
              if (files[0]) {
                choosePhoto(files[0]);
              }
            }}
            onRemove={() => setPhoto(null)}
            onSkip={() => setPhotoSkipped(true)}
            onUnskip={() => setPhotoSkipped(false)}
            photo={photo}
            photoSkipped={photoSkipped}
          />
        </div>

        {/* Footer — gentle status + the gated handoff into the editor. */}
        <div className="flex flex-wrap items-center gap-4 border-border border-t bg-background px-6 py-4 sm:px-8">
          <div className="flex flex-col gap-0.5">
            <span className="caption-micro">{note.kicker}</span>
            <span className="text-muted-foreground text-sm">{note.hint}</span>
          </div>
          <Button
            className="ml-auto h-12 px-8 font-heading text-lg uppercase tracking-wide"
            disabled={!activity}
            onClick={finish}
            size="lg"
          >
            Open the editor
            <ArrowRightIcon />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
