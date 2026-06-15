"use client";

// The export sheet — replaces the old "that's a keeper" success screen. It is
// reached by a deliberate tap (not auto-shown after a save dialog, which was
// the source of the "appears sometimes" bug), and it is where exports actually
// happen: a grid of platform-optimised formats, each rendered live through the
// Hybrid frame and downloadable on its own. Behind it the activity's route
// draws itself in — a calm "still working" gesture rather than confetti.

import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActivityData } from "@/lib/activity";
import { routePath } from "@/lib/chart-helpers";
import type { ColorScheme } from "@/lib/colors";
import { activityMetadata, exportCard } from "@/lib/export-card";
import {
  contentBox,
  type ExportFormat,
  FORMAT_ORDER,
  getFormat,
} from "@/lib/export-formats";
import { effortDateSlug } from "@/lib/export-shared";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { cn } from "@/lib/utils";
import { ToggleRow } from "./control-primitives";
import { RenderTheme, type ThemeId } from "./render-theme";

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
// there's no letterbox whitespace inside the tile.
const TILE_MAX_W = 200;
const TILE_MAX_H = 280;

function fileFor(data: ActivityData, format: ExportFormat): string {
  return `effort_${data.sport}_${effortDateSlug(data.date)}_${format.id}.png`;
}

export function ExportSheet(props: ExportSheetProps) {
  const { data, onKeepEditing, onNew, colors } = props;
  const [gps, setGps] = useState(true);
  const [safeZones, setSafeZones] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
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
      await exportCard(node, {
        filename: fileFor(data, format),
        width: format.width,
        height: format.height,
        metadata,
        metadataOptions: { gps },
      });
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
    <div className="relative flex flex-1 flex-col items-center px-6 py-10">
      <RouteAura
        colors={colors}
        coords={props.routeCoordinates ?? data.routeCoordinates}
      />

      <div className="relative w-full max-w-5xl">
        <div className="font-mono font-semibold text-xs tracking-[0.32em] opacity-55">
          READY TO SHARE
        </div>
        <h2 className="mt-3 font-heading text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl">
          Pick a <span className="text-primary">format.</span>
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-70">
          Each card is optimised for its platform — aspect ratio and safe zones
          baked in. Download one, or grab the whole set.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button disabled={busy !== null} onClick={handleAll} size="lg">
            <DownloadSimpleIcon
              aria-hidden
              className="size-4"
              weight="duotone"
            />
            {busy === "all" ? "Exporting…" : "Download all"}
          </Button>
          <Button onClick={onKeepEditing} size="lg" variant="outline">
            <ArrowLeftIcon aria-hidden className="size-4" weight="duotone" />
            Keep editing
          </Button>
          <Button onClick={onNew} size="lg" variant="ghost">
            <PlusIcon aria-hidden className="size-4" weight="duotone" />
            New
          </Button>
          <div className="ml-auto w-full max-w-[260px] space-y-2 rounded-md border border-foreground/15 px-3 py-2">
            <ToggleRow
              checked={safeZones}
              label="Show safe zones"
              onCheckedChange={setSafeZones}
            />
            <ToggleRow
              checked={gps}
              label="Embed location (GPS)"
              onCheckedChange={setGps}
            />
            <p className="caption-micro opacity-60">
              Attribution is always written. Most apps strip metadata on upload.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-5">
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
}: FormatTileProps) {
  const scale = Math.min(TILE_MAX_W / format.width, TILE_MAX_H / format.height);
  const tileW = format.width * scale;
  const tileH = format.height * scale;
  const isBusy = busy === format.id;

  return (
    <div className="flex flex-col gap-2" style={{ width: tileW }}>
      <div
        className="relative overflow-hidden rounded-md shadow-sm ring-1 ring-foreground/10"
        style={{ width: tileW, height: tileH }}
      >
        {/* Native-size mount, scaled to fill the tile (the format's true shape);
            reffed as the export source (html-to-image forces transform:none +
            native width/height). */}
        <div
          ref={registerMount}
          style={{
            width: format.width,
            height: format.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
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

/** Keep-out guides for a format, scaled to the preview. Dims the platform UI
 *  zones and dashes the content box. Lives in the display layer only, so it is
 *  never part of the exported node. */
function SafeZoneOverlay({
  format,
  scale,
}: {
  format: ExportFormat;
  scale: number;
}) {
  const box = contentBox(format);
  const dim = "rgba(0,0,0,0.5)";
  const topH = box.y * scale;
  const bottomH = (format.height - (box.y + box.h)) * scale;
  const leftW = box.x * scale;
  const rightW = (format.width - (box.x + box.w)) * scale;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: topH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: bottomH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: topH,
          left: 0,
          width: leftW,
          bottom: bottomH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: topH,
          right: 0,
          width: rightW,
          bottom: bottomH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: leftW,
          top: topH,
          width: box.w * scale,
          height: box.h * scale,
          border: "1px dashed rgba(255,255,255,0.85)",
        }}
      />
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
