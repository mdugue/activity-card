"use client";

// The carousel export sheet — the carousel analogue of `ExportSheet`. Same
// overview (a grid of formats, download one or all), reached the same way (a
// tap on the editor's Export action, never an inline download). Each tile's
// preview is a small still image, not a live strip: each format is a
// native-size, photo-backed strip several slides wide, and keeping even one of
// those on screen in the overview is what iOS Safari killed the tab for (Sentry
// EFFORT-4). The real strip is mounted off-screen only while it is being
// captured — once per format for its preview, once more for a download — and
// unmounted straight after; captures run one at a time.
// Downloading renders that strip as its per-slide image set (`renderCarousel`).
// The chrome, the busy/one/all orchestration and the tile itself are the shared
// machinery from `export-sheet.tsx`.

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import { watchExport, watchOverview } from "@/lib/export-watch";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { cn } from "@/lib/utils";
import { CarouselDeck } from "@/theme/carousel/deck";
import type { CarouselTheme } from "@/theme/carousel/define-theme";
import { stripGeometry } from "@/theme/carousel/geometry";
import type { ColorScheme } from "@/theme/core/colors";
import { FORMAT_ORDER, getFormat } from "@/theme/core/export-formats";
import type { ExportFormat } from "@/theme/core/export-formats";
import type { ThemeConfig } from "@/theme/core/params/kinds";
import type { Visibility } from "@/theme/core/visibility";
import {
  createSerialQueue,
  delay,
  effortDateSlug,
} from "@/theme/export/export-shared";
import type { SerialQueue } from "@/theme/export/export-shared";

import {
  ExportShell,
  ExportTile,
  useFormatExports,
  useTileMax,
} from "./export-sheet";
import type { TileBox } from "./export-sheet";

// The slicing export pulls snapdom, so it loads on demand (warmed on mount).
const loadExportCarousel = async () =>
  await import("@/theme/export/export-carousel");

/** How long a capture waits for the off-screen strip to render. */
const MOUNT_TIMEOUT_MS = 3000;
const MOUNT_POLL_MS = 50;

/** Resolve the strip once `read` reports it rendered. */
const waitForStrip = async (
  read: () => HTMLDivElement | null
): Promise<HTMLDivElement | null> => {
  for (let waited = 0; waited <= MOUNT_TIMEOUT_MS; waited += MOUNT_POLL_MS) {
    const node = read();
    if (node?.firstElementChild) {
      return node;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- polling: each check has to wait for React to commit the switch
    await delay(MOUNT_POLL_MS);
  }
  return null;
};

/** Mount `format`'s strip off-screen, run `task` on it once it has rendered,
 *  and unmount it again — whatever `task` does. */
const withStagedStrip = async <T,>(
  stage: (id: string | null) => void,
  read: () => HTMLDivElement | null,
  format: ExportFormat,
  task: (node: HTMLDivElement) => Promise<T>
): Promise<T> => {
  stage(format.id);
  try {
    const node = await waitForStrip(read);
    if (!node) {
      // The strip never rendered — fail loudly, never no-op.
      throw new Error(`The ${format.label} strip did not render`);
    }
    return await task(node);
  } finally {
    stage(null);
  }
};

/** Render the staged strip as its slide images, through the slide-sized
 *  window the stage wraps it in. */
const renderStrip = async (
  strip: HTMLDivElement,
  count: number,
  baseName: string,
  format: ExportFormat
): Promise<File[]> => {
  const window = strip.parentElement;
  if (!window) {
    throw new Error("The carousel strip is not staged in its window");
  }
  const { renderCarousel } = await loadExportCarousel();
  return await renderCarousel({ strip, window }, count, baseName, format);
};

/** Render the staged strip as the overview's small preview image. */
const previewStrip = async (
  node: HTMLDivElement,
  count: number,
  format: ExportFormat
): Promise<string> => {
  const { renderCarouselPreview } = await loadExportCarousel();
  return await renderCarouselPreview(node, count, format);
};

/** Load previews one after another, each queued only once the previous one is
 *  done, so a download tapped meanwhile waits for one preview, not all seven. */
const loadPreviewsInTurn = async <Id extends string>(
  ids: readonly Id[],
  load: (id: Id) => Promise<void>,
  stopped: () => boolean
): Promise<void> => {
  for (const id of ids) {
    if (stopped()) {
      return;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- in turn on purpose: see above
    await load(id);
  }
};

/** Render one preview and hand its URL on. A failed preview only leaves the
 *  tile without its image — the format stays downloadable. */
const loadPreview = async (
  render: () => Promise<string>,
  onReady: (url: string) => void,
  onFailed: () => void
): Promise<void> => {
  try {
    onReady(await render());
  } catch {
    onFailed();
  }
};

/** The preview image and the off-screen strip's native size, as CSS custom
 *  properties. */
interface PreviewStyle extends CSSProperties {
  "--preview"?: string;
}

interface StageStyle extends CSSProperties {
  "--slide-w": string;
  "--stage-h": string;
  "--stage-w": string;
}

// The overview's tile shows an image, so it registers no capture mount.
const noMount = (): void => {
  // The capture mount is the off-screen stage, not the tile.
};

/** The off-screen stage: the native-size strip a capture reads, parked left of
 *  the viewport (laid out, never painted) for as long as the capture runs. The
 *  strip sits in a slide-sized window, so a slide export captures the window
 *  with the strip shifted to that slide. */
const StagedStrip = ({
  children,
  count,
  format,
  mountRef,
}: {
  children: ReactNode;
  count: number;
  format: ExportFormat;
  mountRef: RefObject<HTMLDivElement | null>;
}) => {
  const { slideH, stripW } = stripGeometry(format, count);
  const stageStyle: StageStyle = {
    "--slide-w": `${format.width}px`,
    "--stage-h": `${slideH}px`,
    "--stage-w": `${stripW}px`,
  };
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 -translate-x-full"
      data-testid="capture-stage"
      style={stageStyle}
    >
      <div className="h-(--stage-h) w-(--slide-w) overflow-hidden">
        <div className="h-(--stage-h) w-(--stage-w)" ref={mountRef}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Wide-strip tile box: 220→520 wide, so the grid fits two or three per row on
// desktop and one per row on a phone.
const CAROUSEL_TILE: TileBox = {
  aspect: 0.56,
  capW: 520,
  factor: 0.34,
  floorW: 220,
};

interface CarouselExportSheetProps {
  colors: ColorScheme;
  config: ThemeConfig;
  count: number;
  /** visibility-applied data, for rendering the preview */
  data: ActivityData;
  imageTransform: ImageTransform;
  onKeepEditing: () => void;
  onNew: () => void;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  routeCoordinates?: [number, number][];
  theme: CarouselTheme;
  visibility: Visibility;
}

export const CarouselExportSheet = ({
  colors,
  config,
  count,
  data,
  imageTransform,
  onKeepEditing,
  onNew,
  photoEffects,
  photoUrl,
  routeCoordinates,
  theme,
  visibility,
}: CarouselExportSheetProps) => {
  const tileMax = useTileMax(CAROUSEL_TILE);
  // The deck needs the photo's natural size for the pannable panorama — the same
  // dependency the editor's deck has.
  const imageSize = useImageNaturalSize(photoUrl);
  // The strip mounted off-screen right now (only while a capture runs), plus
  // the format it holds once React has committed it — a capture reads the strip
  // only when the two agree.
  const [stagedId, setStagedId] = useState<string | null>(null);
  const staged = FORMAT_ORDER.find((id) => id === stagedId);
  const stageMount = useRef<HTMLDivElement | null>(null);
  const committedId = useRef<string | null>(null);
  useEffect(() => {
    committedId.current = stagedId;
  }, [stagedId]);

  // Captures share the one stage, so they run one after another.
  const queue = useRef<SerialQueue | null>(null);
  const enqueue = useCallback(
    async <T,>(
      format: ExportFormat,
      task: (node: HTMLDivElement) => Promise<T>
    ): Promise<T> => {
      const runCapture = queue.current ?? createSerialQueue();
      queue.current = runCapture;
      return await runCapture(
        async () =>
          await withStagedStrip(
            setStagedId,
            () =>
              committedId.current === format.id ? stageMount.current : null,
            format,
            task
          )
      );
    },
    []
  );

  useEffect(() => {
    void loadExportCarousel();
  }, []);
  // Report a tab killed while the overview is open.
  useEffect(
    () => watchOverview({ kind: "carousel", mounted: 0, slides: count }),
    [count]
  );
  // The deck draws no photo until its natural size resolves, so capturing before
  // then would rasterise a photo-less strip. Gate previews and downloads on the
  // decode while a photo is shown.
  const photoNotReady = photoUrl !== null && imageSize === null;

  // One small preview image per format, rendered one after another once the
  // photo has decoded. `null` marks a preview that failed — the format stays
  // downloadable, its tile just has no image.
  const [previews, setPreviews] = useState<
    Partial<Record<string, string | null>>
  >({});
  const requested = useRef(new Set<string>());
  const previewUrls = useRef<string[]>([]);
  useEffect(() => {
    let stopped = false;
    if (!photoNotReady) {
      void loadPreviewsInTurn(
        FORMAT_ORDER,
        async (id) => {
          if (requested.current.has(id)) {
            return;
          }
          requested.current.add(id);
          const format = getFormat(id);
          await loadPreview(
            async () =>
              await enqueue(
                format,
                async (node) => await previewStrip(node, count, format)
              ),
            (url) => {
              previewUrls.current.push(url);
              setPreviews((prev) => ({ ...prev, [id]: url }));
            },
            () => {
              setPreviews((prev) => ({ ...prev, [id]: null }));
            }
          );
        },
        () => stopped
      );
    }
    return () => {
      stopped = true;
    };
  }, [count, enqueue, photoNotReady]);
  useEffect(
    () => () => {
      for (const url of previewUrls.current) {
        URL.revokeObjectURL(url);
      }
    },
    []
  );

  const baseName = `effort_${data.sport}_${effortDateSlug(data.date)}_carousel`;
  const renderOne = useCallback(
    async (format: ExportFormat): Promise<File[]> =>
      await watchExport(
        { format: format.id, kind: "carousel", slides: count },
        async () =>
          await enqueue(
            format,
            async (node) =>
              await renderStrip(node, count, `${baseName}_${format.id}`, format)
          )
      ),
    [baseName, count, enqueue]
  );

  const { busy, handleOne, handleAll, progress } = useFormatExports(renderOne, {
    folderFor: (format) => format.id,
    title: "My Effort carousel",
    zipStem: baseName,
  });

  return (
    <ExportShell
      busy={busy}
      colors={colors}
      disabled={photoNotReady}
      onDownloadAll={() => {
        void handleAll();
      }}
      onKeepEditing={onKeepEditing}
      onNew={onNew}
      progress={progress}
      routeCoordinates={routeCoordinates ?? data.routeCoordinates}
      subtitle={
        photoNotReady
          ? "Preparing your photo…"
          : `Each format is a set of ${count} slides. On a phone a set opens the share sheet, so it lands in Photos in one go; Download all bundles every format into one ZIP, a folder per format.`
      }
    >
      <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-7 sm:gap-5">
        {FORMAT_ORDER.map((id) => {
          const format = getFormat(id);
          const { slideH, stripW } = stripGeometry(format, count);
          const preview = previews[id];
          const ready = preview !== undefined && preview !== null;
          const previewStyle: PreviewStyle = ready
            ? { "--preview": `url("${preview}")` }
            : {};
          return (
            <ExportTile
              busy={busy}
              busyId={id}
              disabled={photoNotReady}
              key={id}
              label={format.label}
              nativeH={slideH}
              nativeW={stripW}
              onDownload={() => {
                void handleOne(format);
              }}
              registerMount={noMount}
              sublabel={`${format.aspectLabel} · ${count} × ${format.width}×${format.height}`}
              tileMax={tileMax}
            >
              <div
                aria-hidden
                className={cn(
                  "size-full bg-cover",
                  ready ? "bg-(image:--preview)" : "bg-muted",
                  preview === undefined && "animate-pulse"
                )}
                style={previewStyle}
              />
            </ExportTile>
          );
        })}
      </div>
      {staged === undefined ? null : (
        <StagedStrip
          format={getFormat(staged)}
          count={count}
          mountRef={stageMount}
        >
          <CarouselDeck
            colors={colors}
            config={config}
            data={data}
            format={getFormat(staged)}
            imageSize={imageSize}
            imageTransform={imageTransform}
            photoEffects={photoEffects}
            photoUrl={photoUrl}
            theme={theme}
            visibility={visibility}
          />
        </StagedStrip>
      )}
    </ExportShell>
  );
};
