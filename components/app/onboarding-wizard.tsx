"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ImageIcon,
  MapTrifoldIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
} from "@/components/app/sample-data";
import { StravaConnectButton } from "@/components/app/strava-connect-button";
import { StravaPicker } from "@/components/app/strava-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { ActivityData, ActivitySource } from "@/lib/activity";
import { formatDuration, formatNumber } from "@/lib/format";
import {
  ACTIVITY_FILE_RE,
  type ParsedActivity,
  parseActivityFiles,
} from "@/lib/parse-activity";
import { cn } from "@/lib/utils";

/** What the wizard hands back when the user opens the editor. Exactly one of
 * `parts` (uploaded / Strava activities) or `sample` (a built-in fixture) is
 * set; `source` tells the editor whether to attribute it to Strava. */
export interface OnboardingResult {
  parts?: ParsedActivity[];
  photo: File | null;
  sample?: ActivityData;
  source: ActivitySource;
}

interface OnboardingWizardProps {
  /** Open the Strava picker immediately on mount — used after the OAuth
   * round-trip lands back on the page already connected. */
  initialStravaPickerOpen?: boolean;
  onComplete: (result: OnboardingResult) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

// The activity, once chosen: parsed upload/Strava activities, or a sample.
type WizardActivity =
  | {
      kind: "parts";
      label: string;
      meta: string;
      name: string;
      parts: ParsedActivity[];
      source: ActivitySource;
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

function activityKicker(activity: WizardActivity): string {
  if (activity.kind === "sample") {
    return "Sample loaded";
  }
  return activity.source === "strava" ? "From Strava" : "File loaded";
}

function OrDivider() {
  return (
    <div className="my-2.5 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="caption-micro">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** A wizard step rendered as a shadcn Card; the active step gets a primary
 * ring so attention flows from the activity to the (optional) photo. */
function StepCard({
  active,
  badge,
  badgeClass,
  children,
  num,
  title,
}: {
  active: boolean;
  badge: string;
  badgeClass: string;
  children: React.ReactNode;
  num: string;
  title: string;
}) {
  return (
    <Card
      className={cn("shrink-0 gap-4", active && "ring-2 ring-primary")}
      size="sm"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="font-heading">{num}</span>
          {title}
        </CardTitle>
        <CardAction>
          <Badge className={cn("px-2 py-1", badgeClass)}>{badge}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col">{children}</CardContent>
    </Card>
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
        "flex items-center gap-3 border border-foreground/30 border-dashed bg-foreground/[0.015] px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5 sm:flex-col sm:gap-2 sm:px-4 sm:py-4 sm:text-center",
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
      {parsing ? <Spinner className="size-6 text-primary sm:size-9" /> : icon}
      <span className="flex-1 text-muted-foreground text-sm sm:flex-none">
        {hint}
      </span>
      <span className="inline-flex h-8 shrink-0 items-center bg-foreground px-3 font-heading text-background text-xs uppercase tracking-wide sm:h-9 sm:px-5 sm:text-sm">
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
            <CheckIcon className="size-4" weight="duotone" />
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

// STEP 1 — activity (required): a drop zone, Strava, and samples, or a loaded
// confirmation once something is chosen.
function ActivityStep({
  active,
  activity,
  dragging,
  onBrowse,
  onDragStateChange,
  onFiles,
  onLoadSample,
  onPickFromStrava,
  onRemove,
  parsing,
  strava,
}: {
  active: boolean;
  activity: WizardActivity | null;
  dragging: boolean;
  onBrowse: () => void;
  onDragStateChange: (dragging: boolean) => void;
  onFiles: (files: FileList) => void;
  onLoadSample: (data: ActivityData) => void;
  onPickFromStrava: () => void;
  onRemove: () => void;
  parsing: boolean;
  strava: UseStravaConnection;
}) {
  const stravaLoaded =
    activity?.kind === "parts" && activity.source === "strava";
  return (
    <StepCard
      active={active}
      badge="Required"
      badgeClass="bg-foreground text-background"
      num="01"
      title="Add your activity"
    >
      {activity ? (
        <LoadedRow
          kicker={activityKicker(activity)}
          name={activity.kind === "parts" ? activity.name : activity.label}
          onRemove={onRemove}
          onReplace={stravaLoaded ? onPickFromStrava : onBrowse}
          replaceLabel={stravaLoaded ? "Pick another" : "Swap file"}
          sub={
            activity.kind === "parts" && activity.source === "upload"
              ? `${activity.label} · ${activity.meta}`
              : activity.meta
          }
        />
      ) : (
        <>
          {strava.error === "fetch_failed" ? (
            <Alert className="mb-4 text-left" variant="destructive">
              <WarningCircleIcon weight="duotone" />
              <AlertTitle>We can&apos;t reach the Effort server.</AlertTitle>
              <AlertDescription>
                Strava sign-in is unavailable right now. Drop a file or try a
                sample in the meantime.
              </AlertDescription>
            </Alert>
          ) : null}
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
                className="size-6 text-foreground sm:size-8"
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
              onClick={onPickFromStrava}
              variant="outline"
            >
              Pick from Strava
              {strava.athlete?.firstname
                ? ` · ${strava.athlete.firstname}`
                : ""}
            </Button>
          ) : (
            <StravaConnectButton className="self-start max-sm:[&_img]:h-8 max-sm:[&_img]:w-auto" />
          )}
          <p className="caption-micro mt-3">
            {strava.connected
              ? "Connected"
              : "OAuth · Read-only · Revoke anytime"}
          </p>
          {/* Samples are a desktop affordance; hidden on mobile to keep the
              sheet airy. */}
          <div className="hidden sm:block">
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
          </div>
        </>
      )}
    </StepCard>
  );
}

// STEP 2 — photo (recommended, optional): drop zone + sample thumbs + skip, a
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
      <p className="mb-4 text-muted-foreground text-sm">
        A real photo makes the card unmistakably{" "}
        <span className="font-semibold text-foreground">yours</span>.
      </p>
      <DropZone
        cta="Browse photos"
        dragging={dragging}
        hint="Drop a photo"
        icon={
          <ImageIcon
            className="size-6 text-foreground sm:size-8"
            weight="duotone"
          />
        }
        onBrowse={onBrowse}
        onDragStateChange={onDragStateChange}
        onFiles={onFiles}
      />
      <div className="hidden sm:block">
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
      </div>
      <div className="mt-3">
        <Button onClick={onSkip} size="xs" variant="link">
          Skip for now
        </Button>
      </div>
    </>
  );
}

function PhotoStep({
  active,
  ...body
}: { active: boolean } & React.ComponentProps<typeof PhotoStepBody>) {
  return (
    <StepCard
      active={active}
      badge="Recommended"
      badgeClass="bg-primary text-primary-foreground"
      num="02"
      title="Add a photo"
    >
      <PhotoStepBody {...body} />
    </StepCard>
  );
}

export function OnboardingWizard({
  initialStravaPickerOpen = false,
  onComplete,
  onOpenChange,
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
  const [stravaPickerOpen, setStravaPickerOpen] = useState(false);
  // Guards the async hand-off (sample photos await a fetch) against a
  // double-click firing onComplete twice.
  const [finishing, setFinishing] = useState(false);
  const activityInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Open the Strava picker straight away when we land back from OAuth already
  // connected (the flag flips after mount, so a useState initialiser misses it).
  useEffect(() => {
    if (initialStravaPickerOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStravaPickerOpen(true);
    }
  }, [initialStravaPickerOpen]);

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
      // Count only the activity files (drag-drop can include others), so the
      // confirmation label matches what was actually loaded.
      const matched = Array.from(files).filter((f) =>
        ACTIVITY_FILE_RE.test(f.name)
      );
      setActivity({
        kind: "parts",
        source: "upload",
        parts,
        name:
          matched.length === 1 ? matched[0].name : `${matched.length} files`,
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

  const handleStravaPicked = (parts: ParsedActivity[]) => {
    const first = parts[0];
    setActivity({
      kind: "parts",
      source: "strava",
      parts,
      name: parts.length === 1 ? first.title : `${parts.length} activities`,
      label: first.title,
      meta: activityMeta(first),
    });
    setStravaPickerOpen(false);
  };

  const handleReauth = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/strava/authorize";
    }
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

  const finish = async () => {
    if (!activity || finishing) {
      return;
    }
    setFinishing(true);
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
      activity.kind === "sample"
        ? { sample: activity.data, source: "upload", photo: photoFile }
        : { parts: activity.parts, source: activity.source, photo: photoFile }
    );
  };

  const note = footerNote(Boolean(activity), Boolean(photo));

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex max-h-[96dvh] w-full max-w-[calc(100%-0.5rem)] flex-col gap-0 bg-background p-0 sm:max-h-[88vh] sm:max-w-[60rem]"
        showCloseButton={false}
      >
        {/* Brutalist top accent, as a child bar. The dialog deliberately has
            NO overflow-hidden: combined with its transform positioning, iOS
            Safari clips this top edge. The scrollable body clips itself. */}
        <div aria-hidden className="h-1 shrink-0 bg-foreground" />
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

        {/* Header — title left, close top-right. */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 sm:px-8 sm:pt-6 sm:pb-4">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="text-2xl sm:text-3xl">
              Two steps to your card
            </DialogTitle>
            <DialogDescription className="hidden max-w-md sm:block">
              Bring in an activity, add a photo, then make it yours in the
              editor.
            </DialogDescription>
          </div>
          <DialogClose render={<Button size="icon-sm" variant="outline" />}>
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Body — both steps at once. Flex column when stacked (touch) so the
            cards size to content and can't overlap; a 2-col grid on desktop.
            (A stacked grid with the body's fixed height stretches the rows and
            overlaps the cards.) */}
        {/* Body — both steps. `px-2`/`py-2` (plus the card padding) give the
            active card's `ring-2` room inside the scroll container: with no
            top/side padding, overflow-y-auto shaves the ring's outer edge. */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-2 sm:px-8 md:grid md:grid-cols-2 md:items-start">
          <ActivityStep
            active={!activity}
            activity={activity}
            dragging={dragTarget === "activity"}
            onBrowse={() => activityInputRef.current?.click()}
            onDragStateChange={(d) => setDragTarget(d ? "activity" : null)}
            onFiles={loadFiles}
            onLoadSample={loadSample}
            onPickFromStrava={() => setStravaPickerOpen(true)}
            onRemove={() => setActivity(null)}
            parsing={parsing}
            strava={strava}
          />

          <PhotoStep
            active={Boolean(activity) && !photo && !photoSkipped}
            dragging={dragTarget === "photo"}
            onBrowse={() => photoInputRef.current?.click()}
            onChooseSample={(url, name) => {
              setPhoto({ kind: "sample", name, url });
              setPhotoSkipped(false);
            }}
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

        {/* Footer — one row: status on the left, the gated hand-off on the
            right. On mobile the description sits beside a compact "Open". */}
        <div className="flex items-center gap-3 border-border border-t bg-background px-6 py-3 sm:gap-4 sm:px-8 sm:py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="caption-micro truncate">{note.kicker}</span>
            <span className="hidden truncate text-muted-foreground text-sm sm:block">
              {note.hint}
            </span>
          </div>
          <Button
            className="ml-auto h-11 shrink-0 px-6 font-heading text-base uppercase tracking-wide sm:h-12 sm:px-8 sm:text-lg"
            disabled={!activity || finishing}
            onClick={finish}
            size="lg"
          >
            <span className="sm:hidden">Open</span>
            <span className="hidden sm:inline">Open the editor</span>
            <ArrowRightIcon />
          </Button>
        </div>

        {/* Strava activity selection — a dialog layered over the wizard.
              Nested in the tree (not a sibling portal) so Base UI links the
              two modals; otherwise the wizard marks the picker's portal
              aria-hidden. Picking or combining hands the activity back to
              step 1 so the photo step still follows. */}
        <Dialog onOpenChange={setStravaPickerOpen} open={stravaPickerOpen}>
          <DialogContent
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col gap-0 bg-background p-0 sm:max-h-[85vh]"
            showCloseButton={false}
          >
            <div aria-hidden className="h-1 shrink-0 bg-foreground" />
            <DialogTitle className="sr-only">Pick from Strava</DialogTitle>
            <DialogDescription className="sr-only">
              Choose a recent Strava activity to turn into a card.
            </DialogDescription>
            <div className="flex-1 overflow-y-auto">
              <StravaPicker
                embedded
                onActivityLoaded={handleStravaPicked}
                onCancel={() => setStravaPickerOpen(false)}
                onReauth={handleReauth}
              />
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
