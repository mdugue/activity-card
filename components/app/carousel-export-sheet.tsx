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
// per-tab budget. So the grid never holds more than ONE live deck: each tile is
// rendered live (in its own visible tile) one at a time, rasterised by `snapdom`
// into a small thumbnail, then frozen to that image; downloads re-render the one
// tile at full resolution. Previews use the lighter `photoDisplayUrl` proxy;
// downloads rasterise the full-res original.
//
// Why render LIVE *in the visible tile* rather than an off-screen staging slot:
// iOS Safari only decodes/applies a downloaded @font-face (and paints a cover
// photo) for elements it actually PAINTS. An `opacity:0` or far-off-screen node
// is never painted, so snapdom rasterises the theme text with a system fallback
// font. The single-card export captures a visible on-screen tile and embeds
// fonts correctly — so the carousel does the same: capture the deck while it is
// genuinely on screen, one at a time to stay within the memory budget.
//
// Why capture per SLIDE, not the whole strip at once: iOS Safari will not apply
// an embedded @font-face when it rasterises an `<img>`-rendered SVG wider than
// its internal limit, and a full strip (~3–6k px) is past it — so strip-wide
// captures fall back to a system font (the single card, 1080 px wide, does not).
// `captureCarouselFrames` slides a slide-width clipping window across the deck
// and captures each slide alone, so every snapdom SVG is 1080 px wide like the
// single card; the seamless bleed survives because each window is a portion of
// the SAME full-width deck. The deck is wrapped in `shiftNode` (translated per
// slide) inside the tile's `windowNode` (clipped to one slide during capture).

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
  captureCarouselFrames,
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
// crisply scaled into a tile on a retina display. Each slide is captured at
// `TARGET_PREVIEW_STRIP_W / count` and the slides are composited side by side,
// so this sizes the composited strip — not the live deck, which stays native, so
// it doesn't affect the one-deck-at-a-time memory ceiling.
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

  // The tile rendered LIVE right now (so iOS paints it → fonts + photo embed).
  // Exactly one format is live at a time — the memory ceiling. `mode` picks the
  // proxy (preview) vs full-res (export) photo.
  // `mounts` = the tile's outer box (clipped to one slide during capture);
  // `shifts` = the inner wrapper translated per slide (see `captureCarouselFrames`).
  const mounts = useRef<Record<string, HTMLDivElement | null>>({});
  const shifts = useRef<Record<string, HTMLDivElement | null>>({});
  const [active, setActive] = useState<{ id: string; mode: StageMode } | null>(
    null
  );
  // Rasterised thumbnails, keyed by format id; a frozen tile shows its image.
  const [previews, setPreviews] = useState<Record<string, string>>({});
  // Serialises every job (preview + export) onto one tail promise so only one
  // tile is ever live at a time.
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  // Render `format`'s deck live in its on-screen tile, wait until it has
  // committed + decoded + fonts are ready, then capture it per slide (preview →
  // a composited strip data URL; export → the ordered PNG set). Strictly serial
  // via `chainRef` so only one deck is ever live.
  const runOnTile = useCallback(
    (format: ExportFormat, mode: StageMode): Promise<string | null> => {
      const job = async (): Promise<string | null> => {
        setActive({ id: format.id, mode });
        await decodePhoto(mode === "export" ? photoUrl : photoDisplayUrl);
        await waitForFonts();
        await nextFrame();
        await nextFrame();
        const windowNode = mounts.current[format.id];
        const shiftNode = shifts.current[format.id];
        if (!(windowNode && shiftNode)) {
          throw new Error(`Carousel tile not ready for ${format.id}`);
        }
        if (mode === "preview") {
          // Capture each slide narrow (so iOS embeds the real font), then
          // composite them side by side into the full-strip thumbnail.
          const { slideW, stripW } = stripGeometry(format, count);
          const scale = TARGET_PREVIEW_STRIP_W / stripW;
          const frames = await captureCarouselFrames(
            windowNode,
            shiftNode,
            format,
            count,
            scale
          );
          const strip = document.createElement("canvas");
          strip.width = Math.round(slideW * scale) * count;
          strip.height = frames[0]?.height ?? 0;
          const ctx = strip.getContext("2d");
          if (!ctx) {
            throw new Error("Preview strip canvas unavailable");
          }
          const frameW = Math.round(slideW * scale);
          frames.forEach((frame, i) => {
            ctx.drawImage(frame, i * frameW, 0);
          });
          return strip.toDataURL("image/jpeg", 0.82);
        }
        await exportCarousel(windowNode, shiftNode, count, baseName, format);
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
          const url = await runOnTile(getFormat(id), "preview");
          if (!cancelled && url) {
            setPreviews((prev) => ({ ...prev, [id]: url }));
          }
        } catch {
          // leave the skeleton; a single failed thumbnail isn't fatal
        }
      }
      if (!cancelled) {
        setActive(null); // idle: every tile frozen to its image
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoNotReady, runOnTile]);

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      try {
        await runOnTile(format, "export");
      } catch {
        toast.error("Export failed — please try again.");
      } finally {
        setActive(null);
      }
    },
    [runOnTile]
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
          const src = previews[id];
          const isActive = active?.id === id;
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
              {isActive ? (
                // Rendered live + on-screen (just scaled into the tile) so iOS
                // paints it and snapdom embeds the real fonts + photo. The
                // shifter wrapper is translated per slide and the tile box is
                // clipped to one slide during capture (`captureCarouselFrames`),
                // so each snapdom SVG is single-card width. Export uses the
                // full-res photo, previews the lighter proxy.
                <div
                  ref={(node) => {
                    shifts.current[id] = node;
                  }}
                  style={{ width: stripW, height: slideH }}
                >
                  <CarouselDeck
                    colors={colors}
                    config={config}
                    data={data}
                    format={format}
                    imageSize={imageSize}
                    imageTransform={imageTransform}
                    photoEffects={photoEffects}
                    photoUrl={
                      active.mode === "export" ? photoUrl : photoDisplayUrl
                    }
                    theme={theme}
                    visibility={visibility}
                  />
                </div>
              ) : (
                // Frozen tile: the rasterised thumbnail painted as a background
                // image (the repo's convention over <img>); aspect matches the
                // strip exactly, so `100% 100%` shows it undistorted. Use the
                // `backgroundColor` longhand (not the `background` shorthand),
                // which would reset backgroundSize/Repeat to auto/repeat and tile.
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: src ? undefined : "#eceae6",
                    backgroundImage: src ? `url("${src}")` : undefined,
                    backgroundSize: "100% 100%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              )}
            </ExportTile>
          );
        })}
      </div>
    </ExportShell>
  );
}
