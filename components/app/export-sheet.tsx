"use client";

// The export sheet — replaces the old "that's a keeper" success screen. It is
// reached by a deliberate tap (not auto-shown after a save dialog, which was
// the source of the "appears sometimes" bug), and it is where exports actually
// happen: a grid of platform-optimised formats, each rendered live by the
// format-aware theme and downloadable on its own. Behind it the activity's route
// draws itself in — a calm "still working" gesture rather than confetti.
//
// The chrome (`ExportShell`), the busy/one/all orchestration (`useFormatExports`),
// the responsive tile box (`useTileMax`) and the tile itself (`ExportTile`, a
// children slot for whatever the format renders) are shared with the carousel
// export sheet — see `carousel-export-sheet.tsx`. The single card just supplies a
// `RenderTheme` per tile and exports it with `exportCard`.

import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActivityData } from "@/lib/activity";
import { routePath } from "@/lib/chart-helpers";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { cn } from "@/lib/utils";
import type { ColorScheme } from "@/theme/core/colors";
import { FORMAT_ORDER, getFormat } from "@/theme/core/export-formats";
import type { ExportFormat } from "@/theme/core/export-formats";
import type { ThemeConfig } from "@/theme/core/params/kinds";
import { RenderTheme } from "@/theme/editor/render-theme";
import type { ThemeId } from "@/theme/editor/render-theme";
import { SafeZoneOverlay } from "@/theme/editor/safe-zone-overlay";
import {
  createInFlightGuard,
  effortDateSlug,
  fromCallback,
} from "@/theme/export/export-shared";
import type { InFlightGuard } from "@/theme/export/export-shared";

import { ToggleRow } from "./control-primitives";

// Each tile takes the format's TRUE shape (fit into this bounding box), so
// there's no letterbox whitespace inside the tile. The box is responsive: a
// compact floor keeps several tiles per row on mobile, and it grows with the
// viewport so the previews aren't tiny on desktop.
export interface TileMax {
  h: number;
  w: number;
}

/** A responsive tile bounding box — its floor / cap width, the fraction of the
 *  viewport it tracks, and the height/width ratio. The single card uses a tall
 *  portrait box; the carousel a wide-strip one. */
export interface TileBox {
  aspect: number;
  capW: number;
  factor: number;
  floorW: number;
}

// Portrait card box: 150→280 wide, height tracks at the 1.4 ratio of the floor
// (150×210) so every aspect stays bounded as it scales.
const SINGLE_TILE: TileBox = {
  aspect: 210 / 150,
  capW: 280,
  factor: 0.2,
  floorW: 150,
};

const tileMaxForWidth = (viewportW: number, box: TileBox): TileMax => {
  const w = Math.round(
    Math.min(box.capW, Math.max(box.floorW, viewportW * box.factor))
  );
  return { h: Math.round(w * box.aspect), w };
};

// The tile bounding box, recomputed as the window resizes. Read synchronously
// on first render (these sheets only ever mount client-side, after upload, so
// there's no SSR markup to mismatch) so desktop opens at full size — no flash.
// `box` must be a stable reference (a module constant) — it keys the effect.
export const useTileMax = (box: TileBox = SINGLE_TILE): TileMax => {
  const [tileMax, setTileMax] = useState<TileMax>(() =>
    tileMaxForWidth(
      typeof window === "undefined" ? box.floorW : window.innerWidth,
      box
    )
  );

  // The root element's box tracks the viewport width, so observing it catches
  // every viewport resize; the tile box itself still reads `innerWidth`.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setTileMax(tileMaxForWidth(window.innerWidth, box));
    });
    observer.observe(document.documentElement);
    return () => {
      observer.disconnect();
    };
  }, [box]);

  return tileMax;
};

// The export pipeline (snapdom + the PNG metadata writer) only runs on a
// download tap, so it's loaded on demand rather than with the sheet. The sheet
// warms it on mount so the first tap never waits on the network.
const loadExportCard = async () => await import("@/theme/export/export-card");

const delay = async (ms: number): Promise<void> => {
  await fromCallback<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
  });
};

/** Shared download orchestration: a single `busy` id (a format id, or "all"),
 *  `handleOne` (one format) and `handleAll` (every format, throttled — browsers
 *  rate-limit back-to-back programmatic downloads). The per-mode `exportOne`
 *  body is the only thing that differs (a card vs a sliced strip). */
export const useFormatExports = (
  exportOne: (format: ExportFormat) => Promise<void>
) => {
  // `busy` drives the UI; the guard is what actually serialises exports. React
  // state only updates on the next render, so a double click could otherwise
  // read a stale `busy === null` twice and start two captures.
  const [busy, setBusy] = useState<string | null>(null);
  // Created lazily, on the first export, and kept for the sheet's lifetime.
  const guardRef = useRef<InFlightGuard | null>(null);

  const runExclusive = async (id: string, task: () => Promise<void>) => {
    const guard = guardRef.current ?? createInFlightGuard();
    guardRef.current = guard;
    await guard.run(async () => {
      setBusy(id);
      try {
        await task();
      } catch (error) {
        setBusy(null);
        throw error;
      }
      setBusy(null);
    });
  };

  const handleOne = async (format: ExportFormat) => {
    await runExclusive(format.id, async () => {
      await exportOne(format);
    });
  };

  const exportThenPause = async (format: ExportFormat) => {
    await exportOne(format);
    await delay(350);
  };

  const handleAll = async () => {
    await runExclusive("all", async () => {
      for (const id of FORMAT_ORDER) {
        // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- deliberately sequential: browsers rate-limit back-to-back programmatic downloads, so each format exports then pauses before the next
        await exportThenPause(getFormat(id));
      }
    });
  };

  return { busy, handleAll, handleOne };
};

interface ExportShellProps {
  busy: string | null;
  children: ReactNode;
  colors: ColorScheme;
  /** force-disable the download actions (e.g. while the carousel photo decodes) */
  disabled?: boolean;
  onDownloadAll: () => void;
  onKeepEditing: () => void;
  onNew: () => void;
  /** the activity's route for the background draw-on — from the FULL data, so
   *  it shows even on themes (e.g. Altitude) that don't render the route. */
  routeCoordinates?: [number, number][];
  subtitle: string;
}

/** The activity's route draws itself in behind the grid (or a soft colour aura
 *  when there's no route — e.g. a pool swim). Decorative, never exported. */
const RouteAura = ({
  colors,
  coords,
}: {
  colors: ColorScheme;
  coords?: [number, number][];
}) => {
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
            animation: "effort-route-draw 2.8s ease-out forwards",
            strokeDasharray: 1,
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
          animation: "effort-aura 6s ease-in-out infinite",
          background: `radial-gradient(circle, ${accent}55, transparent 70%)`,
        }}
      />
    </div>
  );
};

/** The shared export-sheet chrome: the drawing-in route aura, the heading, the
 *  Download all / Edit / New toolbar, and a slot for the mode's tiles (plus any
 *  toggles). Both the single-card and carousel sheets render through it. */
export const ExportShell = ({
  busy,
  children,
  colors,
  disabled = false,
  onDownloadAll,
  onKeepEditing,
  onNew,
  routeCoordinates,
  subtitle,
}: ExportShellProps) => (
  <div className="relative flex flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-10">
    <RouteAura colors={colors} coords={routeCoordinates} />

    <div className="relative w-full max-w-5xl lg:max-w-6xl">
      <div className="font-mono text-xs font-semibold tracking-[0.32em] opacity-55">
        READY TO SHARE
      </div>
      <h2 className="font-heading mt-1.5 text-3xl leading-[0.92] tracking-tight uppercase sm:mt-3 sm:text-5xl lg:text-6xl">
        Pick a <span className="text-primary">format.</span>
      </h2>
      <p className="mt-2 max-w-xl text-xs leading-relaxed opacity-70 sm:mt-4 sm:text-sm">
        {subtitle}
      </p>

      <div className="mt-4 flex flex-nowrap items-center gap-2 sm:mt-6 sm:gap-3">
        <Button
          disabled={busy !== null || disabled}
          onClick={onDownloadAll}
          size="sm"
        >
          <DownloadSimpleIcon aria-hidden className="size-4" weight="duotone" />
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

      {children}
    </div>
  </div>
);

interface ExportTileProps {
  busy: string | null;
  /** this tile's id within the busy state (the format id) */
  busyId: string;
  /** the native-size preview to scale into the tile AND rasterise on export */
  children: ReactNode;
  /** force-disable the download button (e.g. while the photo decodes) */
  disabled?: boolean;
  label: string;
  /** native pixel size of `children` — a single card box, or the whole strip */
  nativeH: number;
  nativeW: number;
  onDownload: () => void;
  registerMount: (node: HTMLDivElement | null) => void;
  /** optional platform keep-out guide (single card only; preview, never exported) */
  safe?: { format: ExportFormat; show: boolean };
  sublabel: string;
  /** responsive bounding box every tile fits into (grows with the viewport) */
  tileMax: TileMax;
}

/** One format tile: the native-size preview (`children`) scaled to fit the tile,
 *  reffed as the export source, plus its label + download button. snapdom keeps a
 *  root element's own `scale()`, so the captured node stays untransformed and the
 *  visual scale lives on the wrapper. */
export const ExportTile = ({
  busy,
  busyId,
  children,
  disabled = false,
  label,
  nativeH,
  nativeW,
  onDownload,
  registerMount,
  safe,
  sublabel,
  tileMax,
}: ExportTileProps) => {
  const scale = Math.min(tileMax.w / nativeW, tileMax.h / nativeH);
  const tileW = nativeW * scale;
  const tileH = nativeH * scale;
  const isBusy = busy === busyId;

  return (
    <div className="flex flex-col gap-2" style={{ width: tileW }}>
      <div
        className="ring-foreground/10 relative overflow-hidden rounded-md shadow-sm ring-1"
        style={{ height: tileH, width: tileW }}
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div ref={registerMount} style={{ height: nativeH, width: nativeW }}>
            {children}
          </div>
        </div>
        {safe?.show === true ? (
          <SafeZoneOverlay format={safe.format} scale={scale} />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-heading truncate text-sm tracking-tight uppercase">
            {label}
          </div>
          <div className="caption-micro opacity-60">{sublabel}</div>
        </div>
        <Button
          aria-label={`Download ${label}`}
          disabled={busy !== null || disabled}
          onClick={onDownload}
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
};

interface ExportSheetProps {
  colors: ColorScheme;
  config: ThemeConfig;
  /** visibility-applied data, for rendering the previews */
  data: ActivityData;
  imageTransform: ImageTransform;
  onKeepEditing: () => void;
  onNew: () => void;
  photoBackdropEnabled: boolean;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  routeCoordinates?: [number, number][];
  theme: ThemeId;
}

const fileFor = (data: ActivityData, format: ExportFormat): string =>
  `effort_${data.sport}_${effortDateSlug(data.date)}_${format.id}.png`;

export const ExportSheet = (props: ExportSheetProps) => {
  const {
    data,
    onKeepEditing,
    onNew,
    colors,
    theme,
    config,
    imageTransform,
    photoBackdropEnabled,
    photoEffects,
    photoUrl,
  } = props;
  const [gps, setGps] = useState(true);
  const [safeZones, setSafeZones] = useState(false);
  const tileMax = useTileMax();
  // One native-size mount per format, registered by each tile — the export
  // source. The same node is shown scaled-to-fit in the tile.
  const mounts = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    void loadExportCard();
  }, []);

  const exportOne = useCallback(
    async (format: ExportFormat) => {
      const node = mounts.current[format.id];
      if (!node) {
        // The tile isn't mounted (shouldn't happen) — say so, never no-op.
        toast.error("Export failed — please try again.");
        return;
      }
      // Errors are surfaced here (not bubbled) so a failed format in the
      // download-all loop never aborts the rest of the set.
      try {
        const { activityMetadata, exportCard } = await loadExportCard();
        await exportCard(node, {
          filename: fileFor(data, format),
          height: format.height,
          metadata: activityMetadata(data),
          metadataOptions: { gps },
          width: format.width,
        });
      } catch {
        toast.error("Export failed — please try again.");
      }
    },
    [data, gps]
  );

  const { busy, handleOne, handleAll } = useFormatExports(exportOne);

  return (
    <ExportShell
      busy={busy}
      colors={colors}
      onDownloadAll={() => {
        void handleAll();
      }}
      onKeepEditing={onKeepEditing}
      onNew={onNew}
      routeCoordinates={props.routeCoordinates ?? data.routeCoordinates}
      subtitle="Each card is optimised for its platform — aspect ratio and safe zones baked in. Download one, or grab the whole set."
    >
      <div className="border-foreground/12 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border px-3 py-2">
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
        {FORMAT_ORDER.map((id) => {
          const format = getFormat(id);
          return (
            <ExportTile
              busy={busy}
              busyId={id}
              key={id}
              label={format.label}
              nativeH={format.height}
              nativeW={format.width}
              onDownload={() => {
                void handleOne(format);
              }}
              registerMount={(node) => {
                mounts.current[id] = node;
              }}
              safe={{ format, show: safeZones }}
              sublabel={`${format.aspectLabel} · ${format.width}×${format.height}`}
              tileMax={tileMax}
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
            </ExportTile>
          );
        })}
      </div>
    </ExportShell>
  );
};
