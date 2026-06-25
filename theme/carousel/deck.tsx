// The carousel renderer — the single source of truth, shared by every theme.
// One continuous wide strip (count × slide, sized to the ACTIVE export format —
// 4:5 feed by default): the shared background photo, an optional veil, the
// theme's spanning signature (`canvas`, bled across every slide edge), and the
// per-slide `panels` on top. The editor windows onto it (one slide at a time)
// and the export slices it — both mount this exact component, so preview,
// thumbnails and output always agree.
//
// The deck is format-aware exactly like a single-card theme (see
// `render-theme.tsx`): it renders DIRECTLY at the target size and provides the
// active format to its subtree via `FormatProvider`. The CANVAS reads the strip
// frame (full bleed across all slides); each PANEL reads its own slide frame
// (Step 4d). No external frame scales the strip — geometry flows downward.
//
// There is no per-theme branch here: a theme IS its `canvas` + `panels` (see
// `define-theme.ts` / `registry.ts`). The deck just composes them with the
// resolved deck style and the shared photo layer.

import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import { NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import { carouselMarks } from "@/theme/carousel/marks";
import { resolveDeckStyle } from "@/theme/carousel/resolve";
import { statOptsFor } from "@/theme/carousel/stats";
import type { ColorScheme } from "@/theme/core/colors";
import type { ExportFormat } from "@/theme/core/export-formats";
import { DEFAULT_VISIBILITY, type Visibility } from "@/theme/core/visibility";
import { FormatProvider, useFormat } from "@/theme/shared/format-context";
import { PhotoFxProvider } from "@/theme/shared/photo-fx";
import { CarouselPhoto } from "./carousel-photo";
import type { CarouselTheme } from "./define-theme";
import { slideFormat, stripFormat, stripGeometry } from "./geometry";

interface CarouselDeckProps {
  colors: ColorScheme;
  /** the theme's coerced parameter config (STRATA mood / density / legend) —
   *  feeds both the spanning `canvas` and the theme's `resolveStyle` */
  config?: Record<string, unknown>;
  data: ActivityData;
  /** Target export format. The strip renders directly at this size and feeds the
   *  geometry downward; falls back to the surrounding FormatContext (the 4:5 feed
   *  master when there's none), so a bare mount matches the legacy strip and a
   *  story matrix can supply the format per tile. */
  format?: ExportFormat;
  /** natural size of the photo — enables true-cover, pannable panorama */
  imageSize?: ImageSize | null;
  imageTransform?: ImageTransform | null;
  photoEffects?: PhotoEffects;
  photoUrl?: string | null;
  theme: CarouselTheme;
  /** deck-wide element visibility (toggled in the sidebar) */
  visibility?: Visibility;
}

export function CarouselDeck({
  data,
  theme,
  colors,
  // The theme's own defaults, NOT {} — a bare mount (story, test) must hand a
  // param-driven canvas (STRATA's mood/density) a complete config.
  config = theme.defaults,
  photoUrl,
  imageTransform,
  imageSize = null,
  photoEffects = NO_EFFECTS,
  visibility = DEFAULT_VISIBILITY,
  format,
}: CarouselDeckProps) {
  const total = theme.panels.length;
  // An explicit prop wins; otherwise inherit the ambient FormatContext (which
  // itself defaults to the 4:5 feed master). The strip then sizes itself to the
  // active format and bleeds the geometry down — no Hybrid frame.
  const ctxFormat = useFormat();
  const activeFormat = format ?? ctxFormat;
  const { slideW, slideH, stripW } = stripGeometry(activeFormat, total);

  // One deck-wide style: the look + the resolved accent trio, then the
  // theme's optional post-processor (STRATA's mood swaps the whole palette).
  const baseStyle = resolveDeckStyle(theme.look, theme.label, colors);
  const style = theme.resolveStyle
    ? theme.resolveStyle(baseStyle, config)
    : baseStyle;

  // Every theme shows the photo full-bleed; legibility comes from the per-theme
  // default filter + text shadows, with only a light veil on the standard photo
  // themes. The deck-wide "Use as background" switch gates it — the same flag as
  // the single card. (Data is already visibility-stripped upstream.)
  const showPhoto = Boolean(photoUrl) && visibility.photoBackdrop;
  const veiled = showPhoto && style.veil;
  const desaturate = showPhoto && style.routeStyle === "desaturated";

  const Canvas = theme.canvas;

  // Carousel chrome marks (effort / page numbers) live in the theme config as
  // MARKS params, not in the cross-family Visibility. The only element-
  // visibility a panel still needs is the distance/time stat toggles —
  // everything else is already stripped from `data` upstream.
  const marks = carouselMarks(config);
  const statOpts = statOptsFor(visibility);

  // Two nested coordinate systems off the one format: the deck provides the
  // STRIP frame (full width, read by the canvas); each slot re-provides the
  // SLIDE frame (one slide + its safe insets, read by the panel via SafeArea).
  const slideFmt = slideFormat(activeFormat);

  return (
    <FormatProvider value={stripFormat(activeFormat, total)}>
      <PhotoFxProvider
        value={{
          effects: photoEffects,
          imageSize,
          imageTransform: imageTransform ?? null,
          photoUrl: showPhoto ? (photoUrl ?? null) : null,
        }}
      >
        <div
          style={{
            position: "relative",
            width: stripW,
            height: slideH,
            overflow: "hidden",
            background: style.background,
            color: style.ink,
          }}
        >
          {/* Draw the photo only once its natural size is known — the panorama is
            sized/clamped against it. Rendering a cover fallback before then (or on
            decode failure) would drop the rotate/flip/filter effects and use
            different geometry than the export, so preview and output diverge. */}
          {showPhoto && photoUrl && imageSize ? (
            <CarouselPhoto
              desaturate={desaturate}
              effects={photoEffects}
              imageSize={imageSize}
              photoUrl={photoUrl}
              stripH={slideH}
              stripW={stripW}
              transform={imageTransform}
            />
          ) : null}

          {/* Light veil so text reads over a photo — dark for dark themes, a soft
            paper wash for light ones. */}
          {veiled ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: style.dark
                  ? "rgba(0,0,0,0.34)"
                  : "rgba(255,255,255,0.26)",
              }}
            />
          ) : null}

          {/* Signature spanning layer — reads the STRIP frame, bleeds across every
            slide edge. The canvas owns its own placement (route centred, elevation
            along the bottom, strata full-strip) and renders null when its metric
            is absent. */}
          {Canvas ? (
            <Canvas
              config={config}
              data={data}
              h={slideH}
              overPhoto={showPhoto}
              style={style}
              w={stripW}
            />
          ) : null}

          {/* Per-panel foreground, one component per slide. */}
          {theme.panels.map((Panel, i) => (
            <div
              key={`slide-${i}`}
              style={{
                position: "absolute",
                left: i * slideW,
                top: 0,
                width: slideW,
                height: slideH,
              }}
            >
              <FormatProvider value={slideFmt}>
                <Panel
                  data={data}
                  hasPhoto={showPhoto}
                  index={i}
                  showEffort={marks.showEffort}
                  showPageNumber={marks.showPageNumber}
                  statOpts={statOpts}
                  style={style}
                  total={total}
                />
              </FormatProvider>
            </div>
          ))}
        </div>
      </PhotoFxProvider>
    </FormatProvider>
  );
}
