"use client";

// The carousel export sheet — the carousel analogue of `ExportSheet`. Same
// overview (pick a format, download one or all), reached the same way (a tap on
// the editor's Export action, never an inline download). Downloading a format
// slices the deck strip into its per-slide image set (`exportCarousel`).
//
// iOS Safari memory: a carousel strip is several slides wide (up to ~4320 px),
// and iOS rasterises each CSS-`filter`ed cover photo at its NATIVE layout size
// (~3240×2430) × device-scale² — roughly ~280 MB per deck — regardless of how
// small the tile is shown. Mounting all 7 strips live (even lazily) blows the
// per-tab budget. So the grid never holds live decks: a single off-screen
// staging slot rasterises ONE deck at a time (`snapdom`) into a small `<img>`
// thumbnail, and downloads run the full-res slice on that same one-at-a-time
// stage. At most one live native-size deck exists at any moment — well under the
// editor's tolerated footprint. Previews use the lighter `photoDisplayUrl`
// proxy; downloads rasterise the full-res original, so output quality is intact.

import { snapdom } from "@zumer/snapdom";
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

// Target rasterised width for a preview thumbnail (the whole strip). Small
// enough that the snapdom canvas + data URL stay cheap, large enough to read
// crisply scaled into a tile on a retina display. This only sizes the captured
// image — the live staging deck is always native, so it doesn't affect the
// one-deck-at-a-time memory ceiling.
const TARGET_PREVIEW_STRIP_W = 1024;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** Decode an image URL so the staged deck paints it before snapdom reads it
 *  (the stage mounts the photo on demand, so it may not be decoded yet).
 *  Best-effort — snapdom has its own resource wait. */
async function decodePhoto(url: string | null): Promise<void> {
  if (!url || typeof Image === "undefined") {
    return;
  }
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
  } catch {
    // ignore — capture proceeds; snapdom waits for resources itself
  }
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
  /** lighter proxy used for the staged previews; falls back to `photoUrl` */
  photoDisplayUrl: string | null;
  photoEffects: PhotoEffects;
  /** full-resolution source — only the download rasterises this */
  photoUrl: string | null;
  routeCoordinates?: [number, number][];
  theme: CarouselTheme;
  visibility: Visibility;
}

type StageMode = "preview" | "export";

export function CarouselExportSheet({
  colors,
  config,
  count,
  data,
  imageTransform,
  onKeepEditing,
  onNew,
  photoDisplayUrl,
  photoEffects,
  photoUrl,
  routeCoordinates,
  theme,
  visibility,
}: CarouselExportSheetProps) {
  const tileMax = useTileMax(CAROUSEL_TILE);
  // Cover geometry depends only on the aspect ratio, which the proxy preserves,
  // so measuring the (cheap) proxy gives the same framing as the full-res export.
  const previewUrl = photoDisplayUrl ?? photoUrl;
  const imageSize = useImageNaturalSize(previewUrl);
  const baseName = carouselBaseName(data.sport, data.date);
  const photoNotReady = previewUrl !== null && imageSize === null;

  // The single off-screen staging deck. Exactly one carousel deck is ever
  // mounted (here), one job at a time — the whole point of the fix.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<{
    format: ExportFormat;
    mode: StageMode;
  } | null>(null);
  // Rasterised thumbnails, keyed by format id; tiles show these as <img>.
  const [previews, setPreviews] = useState<Record<string, string>>({});
  // Serialises every stage job (preview + export) onto one tail promise so the
  // stage never holds two decks at once.
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  // Run one job on the staging deck: mount it for `format`/`mode`, wait until it
  // has committed + decoded + fonts are ready, then snapdom it (preview → data
  // URL) or slice it (export → files). Strictly serial via `chainRef`.
  const runOnStage = useCallback(
    (format: ExportFormat, mode: StageMode): Promise<string | null> => {
      const job = async (): Promise<string | null> => {
        setStage({ format, mode });
        await decodePhoto(mode === "export" ? photoUrl : photoDisplayUrl);
        await waitForFonts();
        await nextFrame();
        await nextFrame();
        const node = stageRef.current;
        if (!node) {
          throw new Error(`Carousel stage not ready for ${format.id}`);
        }
        const { slideH, stripW } = stripGeometry(format, count);
        if (mode === "preview") {
          const canvas = await snapdom.toCanvas(node, {
            width: stripW,
            height: slideH,
            scale: TARGET_PREVIEW_STRIP_W / stripW,
            dpr: 1,
            embedFonts: true,
          });
          return canvas.toDataURL("image/jpeg", 0.82);
        }
        await exportCarousel(node, count, baseName, format);
        return null;
      };
      const p = chainRef.current.then(job, job);
      chainRef.current = p.then(
        () => undefined,
        () => undefined
      );
      return p;
    },
    [count, baseName, photoUrl, photoDisplayUrl]
  );

  // Rasterise every format's thumbnail once the photo is ready, in display
  // order (feed first), one at a time. Each lands as it finishes (progressive).
  useEffect(() => {
    if (photoNotReady) {
      return;
    }
    let cancelled = false;
    (async () => {
      for (const id of FORMAT_ORDER) {
        if (cancelled) {
          return;
        }
        try {
          const url = await runOnStage(getFormat(id), "preview");
          if (!cancelled && url) {
            setPreviews((prev) => ({ ...prev, [id]: url }));
          }
        } catch {
          // leave the skeleton; a single failed thumbnail isn't fatal
        }
      }
      if (!cancelled) {
        setStage(null); // idle: no live deck mounted
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoNotReady, runOnStage]);

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      try {
        await runOnStage(format, "export");
      } catch {
        toast.error("Export failed — please try again.");
      } finally {
        setStage(null);
      }
    },
    [runOnStage]
  );

  const { busy, handleOne, handleAll } = useFormatExports(exportOne);

  const stageGeom = stage ? stripGeometry(stage.format, count) : null;

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
          const src = previews[id];
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
              registerMount={() => {
                // no-op: the off-screen stage owns capture now
              }}
              sublabel={`${format.aspectLabel} · ${count} × ${format.width}×${format.height}`}
              tileMax={tileMax}
            >
              {/* A rasterised thumbnail of the deck, painted as a background
                  image (the repo's convention over <img>); no filter, so iOS
                  composites it at display size — cheap. Aspect matches the strip
                  exactly, so `100% 100%` shows it undistorted. */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: src ? undefined : "#eceae6",
                  backgroundImage: src ? `url(${src})` : undefined,
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </ExportTile>
          );
        })}
      </div>

      {/* The lone off-screen staging deck — one at a time, never display:none so
          snapdom can lay it out and capture it. */}
      {stage && stageGeom ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: -100_000,
            top: 0,
            pointerEvents: "none",
          }}
        >
          <div
            ref={stageRef}
            style={{ width: stageGeom.stripW, height: stageGeom.slideH }}
          >
            <CarouselDeck
              colors={colors}
              config={config}
              data={data}
              format={stage.format}
              imageSize={imageSize}
              imageTransform={imageTransform}
              photoEffects={photoEffects}
              photoUrl={stage.mode === "export" ? photoUrl : photoDisplayUrl}
              theme={theme}
              visibility={visibility}
            />
          </div>
        </div>
      ) : null}
    </ExportShell>
  );
}
