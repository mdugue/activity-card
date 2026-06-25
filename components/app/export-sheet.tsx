"use client";

// The export sheet — replaces the old "that's a keeper" success screen. It is
// reached by a deliberate tap (not auto-shown after a save dialog, which was
// the source of the "appears sometimes" bug), and it is where exports actually
// happen: a grid of platform-optimised formats, each rendered live by the
// format-aware theme and downloadable on its own. Behind it the activity's route
// draws itself in — a calm "still working" gesture rather than confetti.

import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActivityData } from "@/lib/activity";
import { routePath } from "@/lib/chart-helpers";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { cn } from "@/lib/utils";
import type { ColorScheme } from "@/theme/core/colors";
import {
  type ExportFormat,
  FORMAT_ORDER,
  getFormat,
} from "@/theme/core/export-formats";
import { RenderTheme, type ThemeId } from "@/theme/editor/render-theme";
import { SafeZoneOverlay } from "@/theme/editor/safe-zone-overlay";
import { activityMetadata, exportCard } from "@/theme/export/export-card";
import { effortDateSlug } from "@/theme/export/export-shared";
import { ToggleRow } from "./control-primitives";

interface ExportSheetProps {
  colors: ColorScheme;
  config: Record<string, unknown>;
  /** visibility-applied data, for rendering the previews */
  data: ActivityData;
  imageTransform: ImageTransform;
  onKeepEditing: () => void;
  onNew: () => void;
  photoBackdropEnabled: boolean;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  /** the activity's route for the background draw-on — from the FULL data, so
   *  it shows even on themes (e.g. Altitude) that don't render the route. */
  routeCoordinates?: [number, number][];
  theme: ThemeId;
}

// Each tile takes the format's TRUE shape (fit into this bounding box), so
// there's no letterbox whitespace inside the tile. The box is responsive: a
// compact floor keeps several tiles per row on mobile, and it grows with the
// viewport so the previews aren't tiny on desktop. Height tracks width at the
// 1.4 ratio of the floor (150×210) so every aspect stays bounded as it scales.
const TILE_FLOOR_W = 150;
const TILE_CAP_W = 280;
const TILE_ASPECT = 210 / 150;

interface TileMax {
  h: number;
  w: number;
}

function tileMaxForWidth(viewportW: number): TileMax {
  const w = Math.round(
    Math.min(TILE_CAP_W, Math.max(TILE_FLOOR_W, viewportW * 0.2))
  );
  return { w, h: Math.round(w * TILE_ASPECT) };
}

// The tile bounding box, recomputed as the window resizes. Read synchronously
// on first render (this sheet only ever mounts client-side, after upload, so
// there's no SSR markup to mismatch) so desktop opens at full size — no flash.
function useTileMax(): TileMax {
  const [tileMax, setTileMax] = useState<TileMax>(() =>
    tileMaxForWidth(
      typeof window === "undefined" ? TILE_FLOOR_W : window.innerWidth
    )
  );

  useEffect(() => {
    const onResize = () => setTileMax(tileMaxForWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return tileMax;
}

function fileFor(data: ActivityData, format: ExportFormat): string {
  return `effort_${data.sport}_${effortDateSlug(data.date)}_${format.id}.png`;
}

export function ExportSheet(props: ExportSheetProps) {
  const { data, onKeepEditing, onNew, colors } = props;
  const [gps, setGps] = useState(true);
  const [safeZones, setSafeZones] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const tileMax = useTileMax();
  // One native-size mount per format, registered by each tile — the export
  // source. The same node is shown scaled-to-fit in the tile.
  const mounts = useRef<Record<string, HTMLDivElement | null>>({});

  const metadata = activityMetadata(data);

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      const node = mounts.current[format.id];
      if (!node) {
        return;
      }
      // Errors are surfaced here (not bubbled) so a failed format in
      // `handleAll` never aborts the rest of the set — matching the toast the
      // single-card editor showed before the export sheet.
      try {
        await exportCard(node, {
          filename: fileFor(data, format),
          width: format.width,
          height: format.height,
          metadata,
          metadataOptions: { gps },
        });
      } catch {
        toast.error("Export failed — please try again.");
      }
    },
    [data, metadata, gps]
  );

  const handleOne = async (format: ExportFormat) => {
    if (busy) {
      return;
    }
    setBusy(format.id);
    try {
      await exportOne(format);
    } finally {
      setBusy(null);
    }
  };

  const handleAll = async () => {
    if (busy) {
      return;
    }
    setBusy("all");
    try {
      for (const id of FORMAT_ORDER) {
        await exportOne(getFormat(id));
        // Browsers throttle back-to-back programmatic downloads; space them out.
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-10">
      <RouteAura
        colors={colors}
        coords={props.routeCoordinates ?? data.routeCoordinates}
      />

      <div className="relative w-full max-w-5xl lg:max-w-6xl">
        <div className="font-mono font-semibold text-[11px] tracking-[0.32em] opacity-55">
          READY TO SHARE
        </div>
        <h2 className="mt-1.5 font-heading text-3xl uppercase leading-[0.92] tracking-tight sm:mt-3 sm:text-5xl lg:text-6xl">
          Pick a <span className="text-primary">format.</span>
        </h2>
        <p className="mt-2 max-w-xl text-xs leading-relaxed opacity-70 sm:mt-4 sm:text-sm">
          Each card is optimised for its platform — aspect ratio and safe zones
          baked in. Download one, or grab the whole set.
        </p>

        <div className="mt-4 flex flex-nowrap items-center gap-2 sm:mt-6 sm:gap-3">
          <Button disabled={busy !== null} onClick={handleAll} size="sm">
            <DownloadSimpleIcon
              aria-hidden
              className="size-4"
              weight="duotone"
            />
            {busy === "all" ? "Exporting…" : "Download all"}
          </Button>
          <Button onClick={onKeepEditing} size="sm" variant="outline">
            <ArrowLeftIcon aria-hidden className="size-4" weight="duotone" />
            Edit
          </Button>
          <Button onClick={onNew} size="sm" variant="ghost">
            <PlusIcon aria-hidden className="size-4" weight="duotone" />
            New
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-foreground/12 px-3 py-2">
          <div className="min-w-[150px] flex-1 sm:flex-none">
            <ToggleRow
              checked={safeZones}
              label="Safe zones"
              onCheckedChange={setSafeZones}
            />
          </div>
          <div className="min-w-[150px] flex-1 sm:flex-none">
            <ToggleRow
              checked={gps}
              label="Location (GPS)"
              onCheckedChange={setGps}
            />
          </div>
          <p className="caption-micro w-full opacity-55 lg:max-w-xs">
            Attribution is always written; most apps strip metadata on upload.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-7 sm:gap-5">
          {FORMAT_ORDER.map((id) => (
            <FormatTile
              busy={busy}
              format={getFormat(id)}
              key={id}
              onDownload={handleOne}
              registerMount={(node) => {
                mounts.current[id] = node;
              }}
              safeZones={safeZones}
              tileMax={tileMax}
              {...props}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface FormatTileProps extends ExportSheetProps {
  busy: string | null;
  format: ExportFormat;
  onDownload: (format: ExportFormat) => void;
  registerMount: (node: HTMLDivElement | null) => void;
  /** overlay the platform keep-out guides (preview only, never exported) */
  safeZones: boolean;
  /** responsive bounding box every tile fits into (grows with the viewport) */
  tileMax: TileMax;
}

function FormatTile({
  format,
  busy,
  onDownload,
  registerMount,
  safeZones,
  data,
  theme,
  colors,
  config,
  imageTransform,
  photoBackdropEnabled,
  photoEffects,
  photoUrl,
  tileMax,
}: FormatTileProps) {
  const scale = Math.min(tileMax.w / format.width, tileMax.h / format.height);
  const tileW = format.width * scale;
  const tileH = format.height * scale;
  const isBusy = busy === format.id;

  return (
    <div className="flex flex-col gap-2" style={{ width: tileW }}>
      <div
        className="relative overflow-hidden rounded-md shadow-sm ring-1 ring-foreground/10"
        style={{ width: tileW, height: tileH }}
      >
        {/* The scaling wrapper shrinks the card to fill the tile (the format's
            true shape). The native-size child it wraps is reffed as the export
            source: snapdom keeps a root element's own `scale()` transform, so
            the captured node must stay untransformed and the visual scale lives
            on the wrapper instead. */}
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div
            ref={registerMount}
            style={{ width: format.width, height: format.height }}
          >
            <RenderTheme
              colors={colors}
              config={config}
              data={data}
              format={format}
              imageTransform={imageTransform}
              photoBackdropEnabled={photoBackdropEnabled}
              photoEffects={photoEffects}
              photoUrl={photoUrl}
              theme={theme}
            />
          </div>
        </div>
        {safeZones ? <SafeZoneOverlay format={format} scale={scale} /> : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-heading text-sm uppercase tracking-tight">
            {format.label}
          </div>
          <div className="caption-micro opacity-60">
            {format.aspectLabel} · {format.width}×{format.height}
          </div>
        </div>
        <Button
          aria-label={`Download ${format.label}`}
          disabled={busy !== null}
          onClick={() => onDownload(format)}
          size="icon"
          variant="secondary"
        >
          <DownloadSimpleIcon
            aria-hidden
            className={cn("size-4", isBusy && "animate-pulse")}
            weight="duotone"
          />
        </Button>
      </div>
    </div>
  );
}

/** The activity's route draws itself in behind the grid (or a soft colour aura
 *  when there's no route — e.g. a pool swim). Decorative, never exported. */
function RouteAura({
  colors,
  coords,
}: {
  colors: ColorScheme;
  coords?: [number, number][];
}) {
  const accent = colors.primary ?? "#c45a2c";
  if (coords && coords.length > 1) {
    return (
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full opacity-25"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 1200 900"
      >
        <title>route</title>
        <path
          d={routePath(coords, 1200, 900, 140)}
          fill="none"
          pathLength={1}
          stroke={accent}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={9}
          style={{
            strokeDasharray: 1,
            animation: "effort-route-draw 2.8s ease-out forwards",
          }}
        />
      </svg>
    );
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute top-1/2 left-1/2 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${accent}55, transparent 70%)`,
          animation: "effort-aura 6s ease-in-out infinite",
        }}
      />
    </div>
  );
}
