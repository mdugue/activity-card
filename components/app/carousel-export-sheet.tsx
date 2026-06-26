"use client";

// The carousel export sheet — the carousel analogue of `ExportSheet`. Same
// overview (pick a format, download one or all), reached the same way (a tap on
// the editor's Export action, never an inline download). The only differences
// from the single card: each tile is the whole n-slide strip rendered by the
// shared `CarouselDeck`, and downloading a format slices that strip into its
// per-slide image set (`exportCarousel`) instead of one card. Everything else —
// the chrome, the busy/one/all orchestration, the responsive tiles — is the
// shared machinery from `export-sheet.tsx`.

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { CarouselDeck } from "@/theme/carousel/deck";
import type { CarouselTheme } from "@/theme/carousel/define-theme";
import { stripGeometry } from "@/theme/carousel/geometry";
import type { ColorScheme } from "@/theme/core/colors";
import {
  type ExportFormat,
  FORMAT_ORDER,
  getFormat,
} from "@/theme/core/export-formats";
import type { Visibility } from "@/theme/core/visibility";
import {
  carouselBaseName,
  exportCarousel,
} from "@/theme/export/export-carousel";
import {
  ExportShell,
  ExportTile,
  type TileBox,
  useFormatExports,
  useTileMax,
} from "./export-sheet";

// Wide-strip tile box (vs the single card's portrait one): a strip is several
// slides across, so it wants a wider, shorter footprint to stay legible.
const CAROUSEL_TILE: TileBox = {
  floorW: 220,
  capW: 520,
  aspect: 0.56,
  factor: 0.34,
};

interface CarouselExportSheetProps {
  colors: ColorScheme;
  config: Record<string, unknown>;
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

export function CarouselExportSheet({
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
}: CarouselExportSheetProps) {
  const tileMax = useTileMax(CAROUSEL_TILE);
  // The deck needs the photo's natural size for the pannable panorama — the same
  // dependency the editor's deck has.
  const imageSize = useImageNaturalSize(photoUrl);
  // One native-size strip mount per format, registered by each tile — the slicing
  // export reads it directly.
  const mounts = useRef<Record<string, HTMLDivElement | null>>({});
  const baseName = carouselBaseName(data.sport, data.date);
  // The deck draws no photo until its natural size resolves, so exporting before
  // then would rasterise a photo-less strip. Gate downloads on the decode while a
  // photo is shown (the single card has a CSS-cover fallback and needs no gate).
  const photoNotReady = photoUrl !== null && imageSize === null;

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      const node = mounts.current[format.id];
      if (!node) {
        return;
      }
      try {
        await exportCarousel(node, count, baseName, format);
      } catch {
        toast.error("Export failed — please try again.");
      }
    },
    [count, baseName]
  );

  const { busy, handleOne, handleAll } = useFormatExports(exportOne);

  return (
    <ExportShell
      busy={busy}
      colors={colors}
      disabled={photoNotReady}
      onDownloadAll={handleAll}
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
              key={id}
              label={format.label}
              nativeH={slideH}
              nativeW={stripW}
              onDownload={() => handleOne(format)}
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
}
