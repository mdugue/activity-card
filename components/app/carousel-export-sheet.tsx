"use client";

// The carousel export sheet — the carousel analogue of `ExportSheet`. Same
// overview (pick a format, download one or all), reached the same way (a tap on
// the editor's Export action, never an inline download). The only differences
// from the single card: each tile is the whole n-slide strip rendered by the
// shared `CarouselDeck`, and downloading a format slices that strip into its
// per-slide image set (`exportCarousel`) instead of one card. Everything else —
// the chrome, the busy/one/all orchestration, the responsive tiles — is the
// shared machinery from `export-sheet.tsx`.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { CarouselDeck } from "@/theme/carousel/deck";
import type { CarouselTheme } from "@/theme/carousel/define-theme";
import { stripGeometry } from "@/theme/carousel/geometry";
import type { ColorScheme } from "@/theme/core/colors";
import { FORMAT_ORDER, getFormat } from "@/theme/core/export-formats";
import type { ExportFormat } from "@/theme/core/export-formats";
import type { ThemeConfig } from "@/theme/core/params/kinds";
import type { Visibility } from "@/theme/core/visibility";
import { delay } from "@/theme/export/export-shared";

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

// Wide-strip tile box (vs the single card's portrait one): a strip is several
// slides across, so it wants a wider, shorter footprint to stay legible.
/** How long an export waits for an offscreen tile's strip to mount. */
const MOUNT_TIMEOUT_MS = 3000;
const MOUNT_POLL_MS = 50;

/** Resolve the format's strip once its deck has rendered into the mount. A
 *  tile only keeps its deck mounted while on screen, so exporting a tile that
 *  is scrolled away (or "Download all") mounts it first. */
const waitForStrip = async (
  read: () => HTMLDivElement | null | undefined
): Promise<HTMLDivElement | null> => {
  for (let waited = 0; waited <= MOUNT_TIMEOUT_MS; waited += MOUNT_POLL_MS) {
    const node = read();
    if (node?.firstElementChild) {
      return node;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- polling: each check has to wait for React to commit the mount
    await delay(MOUNT_POLL_MS);
  }
  return null;
};

/** Wait for the format's strip to mount, then slice and deliver it. */
const exportStrip = async (
  read: () => HTMLDivElement | null | undefined,
  set: { count: number; date: string; sport: string },
  format: ExportFormat
): Promise<void> => {
  const node = await waitForStrip(read);
  if (!node) {
    // The strip never mounted — fail loudly, never no-op.
    throw new Error(`The ${format.label} strip did not mount`);
  }
  const { carouselBaseName, exportCarousel } = await loadExportCarousel();
  const baseName = carouselBaseName(set.sport, set.date);
  await exportCarousel(node, set.count, baseName, format);
};

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
  /** visibility-applied data, for rendering the previews */
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
  // One native-size strip mount per format, registered by each tile — the slicing
  // export reads it directly.
  const mounts = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    void loadExportCarousel();
  }, []);
  // The deck draws no photo until its natural size resolves, so exporting before
  // then would rasterise a photo-less strip. Gate downloads on the decode while a
  // photo is shown (the single card has a CSS-cover fallback and needs no gate).
  const photoNotReady = photoUrl !== null && imageSize === null;

  // The format being exported keeps its strip mounted even offscreen.
  const [exportingId, setExportingId] = useState<string | null>(null);

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      setExportingId(format.id);
      try {
        await exportStrip(
          () => mounts.current[format.id],
          { count, date: data.date, sport: data.sport },
          format
        );
      } catch {
        toast.error("Export failed — please try again.");
      }
      setExportingId(null);
    },
    [count, data.sport, data.date]
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
          : `Each format slices the strip into its ${count} slides — grab one set, or every format. On mobile a set shares as one batch.`
      }
    >
      <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-7 sm:gap-5">
        {FORMAT_ORDER.map((id) => {
          const format = getFormat(id);
          const { slideH, stripW } = stripGeometry(format, count);
          return (
            <ExportTile
              busy={busy}
              busyId={id}
              disabled={photoNotReady}
              forceMount={exportingId === id}
              key={id}
              label={format.label}
              lazy
              nativeH={slideH}
              nativeW={stripW}
              onDownload={() => {
                void handleOne(format);
              }}
              registerMount={(node) => {
                mounts.current[id] = node;
              }}
              sublabel={`${format.aspectLabel} · ${count} × ${format.width}×${format.height}`}
              tileMax={tileMax}
            >
              <CarouselDeck
                colors={colors}
                config={config}
                data={data}
                format={format}
                imageSize={imageSize}
                imageTransform={imageTransform}
                photoEffects={photoEffects}
                photoUrl={photoUrl}
                theme={theme}
                visibility={visibility}
              />
            </ExportTile>
          );
        })}
      </div>
    </ExportShell>
  );
};
