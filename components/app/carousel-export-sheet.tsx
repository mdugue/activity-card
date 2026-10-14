"use client";

// The carousel export sheet — the carousel analogue of `ExportSheet`. Same
// overview (pick a format, download one or all), reached the same way (a tap on
// the editor's Export action, never an inline download). A row of format chips
// sits above ONE preview tile, and that preview is a small still image, not a
// live strip: each format is a native-size, photo-backed strip several slides
// wide, and keeping even one of those on screen in the overview is what iOS
// Safari killed the tab for (Sentry EFFORT-4). The real strip is mounted
// off-screen only while it is being captured — once small for the preview,
// once at export size for a download — and unmounted straight after.
// Downloading slices that strip into its per-slide image set (`exportCarousel`).
// The chrome, the busy/one/all orchestration and the tile itself are the shared
// machinery from `export-sheet.tsx`.

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { toast } from "sonner";

import {
  OptionToggleItem,
  ScrollToggleGroup,
} from "@/components/app/primitives/toggle-group";
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
import {
  DEFAULT_FORMAT_ID,
  FORMAT_ORDER,
  getFormat,
} from "@/theme/core/export-formats";
import type { ExportFormat, ExportFormatId } from "@/theme/core/export-formats";
import type { ThemeConfig } from "@/theme/core/params/kinds";
import type { Visibility } from "@/theme/core/visibility";
import { createSerialQueue, delay } from "@/theme/export/export-shared";
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

/** How long an export waits for the preview to show its format. */
const MOUNT_TIMEOUT_MS = 3000;
const MOUNT_POLL_MS = 50;

/** Resolve the strip once `read` reports it rendered (the preview may first
 *  have to switch to the format being exported). */
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

/** Slice the staged strip into its slides and deliver them. */
const exportStrip = async (
  node: HTMLDivElement,
  set: { count: number; date: string; sport: string },
  format: ExportFormat
): Promise<void> => {
  const { carouselBaseName, exportCarousel } = await loadExportCarousel();
  await exportCarousel(
    node,
    set.count,
    carouselBaseName(set.sport, set.date),
    format
  );
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
  "--stage-h": string;
  "--stage-w": string;
}

// The overview's tile shows an image, so it registers no capture mount.
const noMount = (): void => {
  // The capture mount is the off-screen stage, not the tile.
};

/** The off-screen stage: the native-size strip a capture reads, parked left of
 *  the viewport (laid out, never painted) for as long as the capture runs. */
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
      <div className="h-(--stage-h) w-(--stage-w)" ref={mountRef}>
        {children}
      </div>
    </div>
  );
};

// The one preview gets the room the seven tiles used to share: wide, and
// growing with the viewport.
const CAROUSEL_TILE: TileBox = {
  aspect: 0.56,
  capW: 960,
  factor: 0.86,
  floorW: 300,
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
  const [selectedId, setSelectedId] =
    useState<ExportFormatId>(DEFAULT_FORMAT_ID);
  const shown = getFormat(selectedId);
  const { slideH, stripW } = stripGeometry(shown, count);

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

  // One small preview image per format, rendered the first time it is picked.
  const [previews, setPreviews] = useState<Partial<Record<string, string>>>({});
  const requested = useRef(new Set<string>());
  const previewUrls = useRef<string[]>([]);
  useEffect(() => {
    if (photoNotReady || requested.current.has(shown.id)) {
      return;
    }
    requested.current.add(shown.id);
    void loadPreview(
      async () =>
        await enqueue(
          shown,
          async (node) => await previewStrip(node, count, shown)
        ),
      (url) => {
        previewUrls.current.push(url);
        setPreviews((prev) => ({ ...prev, [shown.id]: url }));
      },
      () => {
        // Let a later pick of the format try again.
        requested.current.delete(shown.id);
      }
    );
  }, [count, enqueue, photoNotReady, shown]);
  useEffect(
    () => () => {
      for (const url of previewUrls.current) {
        URL.revokeObjectURL(url);
      }
    },
    []
  );
  const preview = previews[shown.id];
  const previewStyle: PreviewStyle =
    preview === undefined ? {} : { "--preview": `url("${preview}")` };

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      try {
        await watchExport(
          { format: format.id, kind: "carousel", slides: count },
          async () => {
            await enqueue(format, async (node) => {
              await exportStrip(
                node,
                { count, date: data.date, sport: data.sport },
                format
              );
            });
          }
        );
      } catch {
        toast.error("Export failed — please try again.");
      }
    },
    [count, data.sport, data.date, enqueue]
  );

  const { busy, handleOne, handleAll } = useFormatExports(exportOne);

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
      routeCoordinates={routeCoordinates ?? data.routeCoordinates}
      subtitle={
        photoNotReady
          ? "Preparing your photo…"
          : `Pick a format to preview its ${count} slides — grab one set, or every format. On mobile a set shares as one batch.`
      }
    >
      <ScrollToggleGroup
        aria-label="Format"
        className="mx-auto mt-5 flex max-w-full justify-start overflow-x-auto sm:mt-7 sm:flex-wrap sm:justify-center"
        disabled={busy !== null}
        onValueChange={(values) => {
          const picked = FORMAT_ORDER.find((id) => id === values[0]);
          if (picked !== undefined) {
            setSelectedId(picked);
          }
        }}
        spacing={2}
        value={[shown.id]}
      >
        {FORMAT_ORDER.map((id) => {
          const format = getFormat(id);
          return (
            <OptionToggleItem key={id} look="chip" tone="invert" value={id}>
              {format.label}
              <span className="opacity-60">{format.aspectLabel}</span>
            </OptionToggleItem>
          );
        })}
      </ScrollToggleGroup>
      <div className="mt-4 flex justify-center sm:mt-6">
        <ExportTile
          busy={busy}
          busyId={shown.id}
          disabled={photoNotReady}
          label={shown.label}
          nativeH={slideH}
          nativeW={stripW}
          onDownload={() => {
            void handleOne(shown);
          }}
          registerMount={noMount}
          sublabel={`${shown.aspectLabel} · ${count} × ${shown.width}×${shown.height}`}
          tileMax={tileMax}
        >
          <div
            aria-hidden
            className={cn(
              "size-full bg-cover",
              preview === undefined
                ? "bg-muted animate-pulse"
                : "bg-(image:--preview)"
            )}
            style={previewStyle}
          />
        </ExportTile>
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
