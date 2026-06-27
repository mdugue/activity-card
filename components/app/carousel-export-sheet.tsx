"use client";

// The carousel export sheet — the carousel analogue of `ExportSheet`. Same
// overview (pick a format, download one or all), reached the same way (a tap on
// the editor's Export action, never an inline download). The only differences
// from the single card: each tile is the whole n-slide strip rendered by the
// shared `CarouselDeck`, and downloading a format slices that strip into its
// per-slide image set (`exportCarousel`) instead of one card. Everything else —
// the chrome, the busy/one/all orchestration, the responsive tiles — is the
// shared machinery from `export-sheet.tsx`.
//
// iOS Safari memory: a carousel strip is several slides wide (up to ~4320 px),
// and a CSS-`filter`ed photo layer is buffered at its element size regardless of
// how small the tile is shown — so mounting all 7 native-size strips at once
// blows the per-tab budget. Two guards keep it bounded: (1) each tile's deck is
// only mounted while near the viewport (`LazyTilePreview`), so the live set is
// just what's on screen; (2) previews paint the lighter `photoDisplayUrl` proxy,
// and only the tile being exported is force-mounted at full resolution for the
// snapdom capture — one heavy strip at a time. The proxy preserves the photo's
// aspect, so the cover geometry (and thus the exported framing) is identical.

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { waitForFonts } from "@/theme/export/export-shared";
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

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** Decode an image URL so the about-to-capture deck paints it (the export deck
 *  mounts full-res on demand, so its photo may not be decoded yet). Best-effort
 *  — snapdom still waits for resources if this fails. */
async function decodePhoto(url: string | null): Promise<void> {
  if (!url || typeof Image === "undefined") {
    return;
  }
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
  } catch {
    // ignore — capture proceeds; snapdom has its own load wait
  }
}

/** Mounts its children only while near the viewport (or when `forced` for an
 *  in-flight export). Keeps the live deck set bounded to what's on screen so a
 *  long export grid never holds 7 wide strips at once. */
function LazyTilePreview({
  forced,
  children,
}: {
  children: ReactNode;
  forced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // reason: latch on once visible; unmount only when fully clear again
        setNear(entries.some((e) => e.isIntersecting));
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {near || forced ? (
        children
      ) : (
        // Neutral fill so an off-screen tile reads as "loading", not broken.
        <div style={{ width: "100%", height: "100%", background: "#eceae6" }} />
      )}
    </div>
  );
}

interface CarouselExportSheetProps {
  colors: ColorScheme;
  config: Record<string, unknown>;
  count: number;
  /** visibility-applied data, for rendering the previews */
  data: ActivityData;
  imageTransform: ImageTransform;
  onKeepEditing: () => void;
  onNew: () => void;
  /** lighter proxy used for the on-screen previews; falls back to `photoUrl` */
  photoDisplayUrl: string | null;
  photoEffects: PhotoEffects;
  /** full-resolution source — only the tile being exported renders this */
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
  photoDisplayUrl,
  photoUrl,
  routeCoordinates,
  theme,
  visibility,
}: CarouselExportSheetProps) {
  const tileMax = useTileMax(CAROUSEL_TILE);
  // The deck needs the photo's natural size for the pannable panorama. Measure
  // the (cheap) proxy — cover geometry depends only on the aspect ratio, which
  // the proxy preserves, so the export framing is unchanged.
  const previewUrl = photoDisplayUrl ?? photoUrl;
  const imageSize = useImageNaturalSize(previewUrl);
  // One native-size strip mount per format, registered by each tile — the
  // slicing export reads the one being exported directly.
  const mounts = useRef<Record<string, HTMLDivElement | null>>({});
  // The format whose tile is force-mounted at full resolution for capture.
  const [exportTarget, setExportTarget] = useState<string | null>(null);
  const baseName = carouselBaseName(data.sport, data.date);
  // The deck draws no photo until its natural size resolves, so exporting before
  // then would rasterise a photo-less strip. Gate downloads on the decode while a
  // photo is shown (the single card has a CSS-cover fallback and needs no gate).
  const photoNotReady = previewUrl !== null && imageSize === null;

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      // Force-mount this format's tile at full resolution, then wait for it to
      // commit, lay out and decode before snapdom reads it.
      setExportTarget(format.id);
      try {
        await decodePhoto(photoUrl);
        await waitForFonts();
        await nextFrame();
        await nextFrame();
        const node = mounts.current[format.id];
        if (!node) {
          throw new Error(`Carousel export node for ${format.id} not ready`);
        }
        await exportCarousel(node, count, baseName, format);
      } catch {
        toast.error("Export failed — please try again.");
      } finally {
        setExportTarget(null);
      }
    },
    [count, baseName, photoUrl]
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
          // The tile being exported renders the full-res original; the rest the
          // lighter proxy. Same aspect → identical cover geometry either way.
          const forced = exportTarget === id;
          const tilePhotoUrl = forced ? photoUrl : photoDisplayUrl;
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
              <LazyTilePreview forced={forced}>
                <CarouselDeck
                  colors={colors}
                  config={config}
                  data={data}
                  format={format}
                  imageSize={imageSize}
                  imageTransform={imageTransform}
                  photoEffects={photoEffects}
                  photoUrl={tilePhotoUrl}
                  theme={theme}
                  visibility={visibility}
                />
              </LazyTilePreview>
            </ExportTile>
          );
        })}
      </div>
    </ExportShell>
  );
}
