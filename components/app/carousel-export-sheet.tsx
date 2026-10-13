"use client";

// The carousel export sheet — the carousel analogue of `ExportSheet`. Same
// overview (pick a format, download one or all), reached the same way (a tap on
// the editor's Export action, never an inline download). Unlike the single card
// it shows ONE live preview: a row of format chips above a single tile holding
// the whole n-slide strip rendered by the shared `CarouselDeck`. Each format is
// a native-size, photo-backed strip several slides wide, and a tile per format
// (seven at once) is more than iOS Safari will hold — it killed the tab as the
// overview opened. Downloading slices the shown strip into its per-slide image
// set (`exportCarousel`); "Download all" steps the preview through each format.
// The chrome, the busy/one/all orchestration and the tile itself are the shared
// machinery from `export-sheet.tsx`.

import { useCallback, useEffect, useRef, useState } from "react";
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

/** Wait for the format's strip to render, then slice and deliver it. */
const exportStrip = async (
  read: () => HTMLDivElement | null,
  set: { count: number; date: string; sport: string },
  format: ExportFormat
): Promise<void> => {
  const node = await waitForStrip(read);
  if (!node) {
    // The strip never rendered — fail loudly, never no-op.
    throw new Error(`The ${format.label} strip did not render`);
  }
  const { carouselBaseName, exportCarousel } = await loadExportCarousel();
  const baseName = carouselBaseName(set.sport, set.date);
  await exportCarousel(node, set.count, baseName, format);
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
  // The format being exported takes over the preview until it is done.
  const [exportingId, setExportingId] = useState<string | null>(null);
  const shownId = FORMAT_ORDER.find((id) => id === exportingId) ?? selectedId;
  const shown = getFormat(shownId);
  const { slideH, stripW } = stripGeometry(shown, count);

  // The one native-size strip mount, plus the format it holds once React has
  // committed it — an export reads the strip only when the two agree.
  const mount = useRef<HTMLDivElement | null>(null);
  const committedId = useRef<string | null>(null);
  useEffect(() => {
    committedId.current = shownId;
  }, [shownId]);
  useEffect(() => {
    void loadExportCarousel();
  }, []);
  // Report a tab killed while the overview is open (one strip is mounted).
  useEffect(
    () => watchOverview({ kind: "carousel", mounted: 1, slides: count }),
    [count]
  );
  // The deck draws no photo until its natural size resolves, so exporting before
  // then would rasterise a photo-less strip. Gate downloads on the decode while a
  // photo is shown (the single card has a CSS-cover fallback and needs no gate).
  const photoNotReady = photoUrl !== null && imageSize === null;

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      setExportingId(format.id);
      try {
        await watchExport(
          { format: format.id, kind: "carousel", slides: count },
          async () => {
            await exportStrip(
              () => (committedId.current === format.id ? mount.current : null),
              { count, date: data.date, sport: data.sport },
              format
            );
          }
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
        value={[shownId]}
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
          busyId={shownId}
          disabled={photoNotReady}
          label={shown.label}
          nativeH={slideH}
          nativeW={stripW}
          onDownload={() => {
            void handleOne(shown);
          }}
          registerMount={(node) => {
            mount.current = node;
          }}
          sublabel={`${shown.aspectLabel} · ${count} × ${shown.width}×${shown.height}`}
          tileMax={tileMax}
        >
          <CarouselDeck
            colors={colors}
            config={config}
            data={data}
            format={shown}
            imageSize={imageSize}
            imageTransform={imageTransform}
            photoEffects={photoEffects}
            photoUrl={photoUrl}
            theme={theme}
            visibility={visibility}
          />
        </ExportTile>
      </div>
    </ExportShell>
  );
};
