// The carousel renderer — the single source of truth. One continuous wide strip
// (n×1080 × 1350): a theme-specific signature layer spans the full width and
// bleeds across every slide edge, with per-panel content on top. The editor
// windows onto it (one slide at a time) and the export slices it — both use this
// exact component, so preview, thumbnails and output always agree.
//
// Each theme picks its own signature (heroLayer), panel layout (panelKind), hero
// metric and an optional wrap-up cross-viz — so the themes read as genuinely
// different designs, not colour swaps.

import type { ActivityData } from "@/components/app/sample-data";
import type { ImageSize } from "@/hooks/use-image-natural-size";
import { pickProfile } from "@/lib/carousel/profile";
import { type EffectiveStyle, resolveDeckStyle } from "@/lib/carousel/resolve";
import { heroStat, planSlideStats } from "@/lib/carousel/stats";
import type { CarouselThemeId, PanelKind } from "@/lib/carousel/theme-tokens";
import { SLIDE_H, SLIDE_W, type Slide } from "@/lib/carousel/types";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import { filterCss, NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import { DEFAULT_VISIBILITY, type Visibility } from "@/lib/visibility";
import { CarouselPhoto } from "./carousel-photo";
import { ElevationBand } from "./elevation-band";
import { FramePanel } from "./panels/frame-panel";
import { PressPanel } from "./panels/press-panel";
import { RouteLine } from "./route-line";
import { TEMPLATES } from "./templates";
import type { TemplateProps } from "./templates/shared";

function panelFor(
  kind: PanelKind,
  template: Slide["template"]
): (props: TemplateProps) => React.JSX.Element {
  if (kind === "frame") {
    return FramePanel;
  }
  if (kind === "press") {
    return PressPanel;
  }
  return TEMPLATES[template];
}

interface SeamlessCanvasProps {
  accent: string;
  data: ActivityData;
  /** natural size of the photo — enables true-cover, pannable panorama */
  imageSize?: ImageSize | null;
  imageTransform?: ImageTransform | null;
  photoEffects?: PhotoEffects;
  photoTheme?: PaletteTheme | null;
  photoUrl?: string | null;
  slides: Slide[];
  theme: CarouselThemeId;
  /** deck-wide element visibility (toggled in the sidebar) */
  visibility?: Visibility;
}

export function SeamlessCanvas({
  data,
  slides,
  theme,
  accent,
  photoUrl,
  imageTransform,
  imageSize = null,
  photoEffects = NO_EFFECTS,
  photoTheme = null,
  visibility = DEFAULT_VISIBILITY,
}: SeamlessCanvasProps) {
  const total = slides.length;
  const width = total * SLIDE_W;
  const style: EffectiveStyle = resolveDeckStyle(theme, accent, photoTheme);
  const hasPhoto = Boolean(photoUrl);

  // Every photo-capable theme now shows the photo full-bleed (no faint-texture
  // mode); legibility comes from the per-theme default filter + text shadows,
  // with only a light veil on the standard photo themes.
  const showPhoto = hasPhoto && style.photoSupported;
  const isStandard = style.panelKind === "standard";
  const desaturate = showPhoto && style.routeStyle === "desaturated";
  const photoFilter = filterCss(photoEffects.filter);

  const { profile, mode: profileMode } = pickProfile(data);

  const showElevationHero =
    style.heroLayer === "elevation" && (profile?.length ?? 0) > 1;
  const showRouteHero = style.heroLayer === "route";

  const heroInk = showPhoto && style.dark ? "#ffffff" : style.ink;

  const statOpts = { distance: visibility.distance, time: visibility.time };
  const slidePlan = planSlideStats(data, slides, style, statOpts);
  const hero = heroStat(data, style.heroMetric, statOpts);

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
      {(() => {
        // Draw the photo only once its natural size is known — the panorama is
        // sized/clamped against it. Rendering a cover fallback before then (or
        // on decode failure) would drop the rotate/flip/filter effects and use
        // different geometry than the export, so preview and output diverge.
        if (!(showPhoto && photoUrl && imageSize)) {
          return null;
        }
        return (
          <CarouselPhoto
            desaturate={desaturate}
            filter={photoFilter}
            flipH={photoEffects.flipH}
            flipV={photoEffects.flipV}
            grain={photoEffects.grain}
            imageSize={imageSize}
            photoUrl={photoUrl}
            rotate={photoEffects.rotate}
            stripH={SLIDE_H}
            stripW={width}
            transform={imageTransform}
          />
        );
      })()}

      {/* Light veil so text reads over a photo — dark for dark themes, a soft
          paper wash for light ones. Type-led themes (Frame / Press) protect
          their own text (shadows / opaque boxes), so they skip it. */}
      {showPhoto && isStandard ? (
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

      {/* Signature spanning layer — bleeds across every slide edge. */}
      {showElevationHero ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "62%",
          }}
        >
          <ElevationBand
            colors={style.elevation}
            h={SLIDE_H * 0.62}
            mode={profileMode}
            profile={profile}
            w={width}
          />
        </div>
      ) : null}

      {showRouteHero ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Sits in the upper-middle so the bottom-anchored title/stats clear
            // it instead of the line striking through the headline.
            top: "14%",
            height: "40%",
          }}
        >
          <RouteLine
            accent={style.accent}
            accent2={style.accent2}
            coords={data.routeCoordinates}
            h={SLIDE_H * 0.4}
            ink={heroInk}
            overPhoto={showPhoto}
            pad={60}
            showMarkers
            stretch
            strokeWidth={8}
            style={style.routeStyle}
            w={width}
          />
        </div>
      ) : null}

      {/* Per-panel foreground. The wrap-up cross-viz is drawn inside the
          editorial template (centred), not here. */}
      {slides.map((slide, i) => {
        const Panel = panelFor(style.panelKind, slide.template);
        return (
          <div
            key={slide.id}
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
              hero={hero}
              index={i}
              showEffort={visibility.showEffort}
              showPageNumber={visibility.showPageNumber}
              stats={slidePlan[i]}
              style={style}
              total={total}
              visibility={visibility}
            />
          </div>
        );
      })}
    </div>
  );
}
