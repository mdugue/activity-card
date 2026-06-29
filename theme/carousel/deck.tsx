// The carousel renderer — the single source of truth, shared by every theme.
// One continuous wide strip (count × slide, sized to the active export format).
// The editor windows onto it and the export slices it — both mount this exact
// component, so preview, thumbnails and output always agree.
//
// Format-aware like a single-card theme (see `render-theme.tsx`): it renders at
// the target size and provides the format to its subtree. The canvas reads the
// strip frame (full bleed); each panel reads its own slide frame. There is no
// per-theme branch: a theme IS its `canvas` + `panels`.

import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import { NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import { carouselMarks } from "@/theme/carousel/marks";
import { resolveDeckStyle } from "@/theme/carousel/resolve";
import type { ColorScheme } from "@/theme/core/colors";
import type { ExportFormat } from "@/theme/core/export-formats";
import { DEFAULT_VISIBILITY, type Visibility } from "@/theme/core/visibility";
import { CoverPhoto } from "@/theme/shared/cover-photo";
import { FormatProvider, useFormat } from "@/theme/shared/format-context";
import { PhotoFxProvider } from "@/theme/shared/photo-fx";
import type { CarouselTheme } from "./define-theme";
import { stripFormat, stripGeometry } from "./geometry";

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
  // Explicit prop wins, else inherit the ambient FormatContext (feed by default).
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
  const showPhoto =
    Boolean(photoUrl) && visibility.photo && theme.uses.includes("photo");
  const veiled = showPhoto && style.veil;
  const desaturate = showPhoto && style.routeStyle === "desaturated";

  const Canvas = theme.canvas;

  // Marks live in the theme config (MARKS params); every element a panel renders
  // is already gated by stripping `data` upstream.
  const marks = carouselMarks(config);

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
            <CoverPhoto
              boxH={slideH}
              boxW={stripW}
              effects={photoEffects}
              extraFilter={
                desaturate ? "saturate(0.6) brightness(1.05)" : undefined
              }
              imageSize={imageSize}
              photoUrl={photoUrl}
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
              {/* per-slide: reset to the SLIDE frame so panels inset via SafeArea */}
              <FormatProvider value={activeFormat}>
                <Panel
                  data={data}
                  hasPhoto={showPhoto}
                  index={i}
                  showEffort={marks.showEffort}
                  showPageNumber={marks.showPageNumber}
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
