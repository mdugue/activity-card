// The carousel renderer — the single source of truth, shared by every theme.
// One continuous wide strip (n×1080 × 1350): the shared background photo, an
// optional veil, the theme's spanning signature (`canvas`, bled across every
// slide edge), and the per-slide `panels` on top. The editor windows onto it
// (one slide at a time) and the export slices it — both mount this exact
// component, so preview, thumbnails and output always agree.
//
// There is no per-theme branch here: a theme IS its `canvas` + `panels` (see
// `define-theme.ts` / `registry.ts`). The deck just composes them with the
// resolved deck style and the shared photo layer.

import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import { carouselMarks } from "@/lib/carousel/marks";
import { resolveDeckStyle } from "@/lib/carousel/resolve";
import { statOptsFor } from "@/lib/carousel/stats";
import { SLIDE_H, SLIDE_W } from "@/lib/carousel/types";
import type { ColorScheme } from "@/lib/colors";
import type { ImageTransform } from "@/lib/image-transform";
import { NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import { DEFAULT_VISIBILITY, type Visibility } from "@/lib/visibility";
import { CarouselPhoto } from "./carousel-photo";
import type { CarouselTheme } from "./define-theme";

interface CarouselDeckProps {
  colors: ColorScheme;
  /** the theme's coerced parameter config (STRATA mood / density / legend) —
   *  feeds both the spanning `canvas` and the theme's `resolveStyle` */
  config?: Record<string, unknown>;
  data: ActivityData;
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
}: CarouselDeckProps) {
  const total = theme.panels.length;
  const width = total * SLIDE_W;

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

  return (
    <div
      style={{
        position: "relative",
        width,
        height: SLIDE_H,
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
          stripH={SLIDE_H}
          stripW={width}
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

      {/* Signature spanning layer — bleeds across every slide edge. The canvas
          owns its own placement (route centred, elevation along the bottom,
          strata full-strip) and renders null when its metric is absent. */}
      {Canvas ? (
        <Canvas
          config={config}
          data={data}
          h={SLIDE_H}
          overPhoto={showPhoto}
          style={style}
          w={width}
        />
      ) : null}

      {/* Per-panel foreground, one component per slide. */}
      {theme.panels.map((Panel, i) => (
        <div
          key={`slide-${i}`}
          style={{
            position: "absolute",
            left: i * SLIDE_W,
            top: 0,
            width: SLIDE_W,
            height: SLIDE_H,
          }}
        >
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
        </div>
      ))}
    </div>
  );
}
