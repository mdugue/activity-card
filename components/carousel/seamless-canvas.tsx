// The carousel renderer — the single source of truth. One continuous wide
// strip (n×1080 × 1350): a theme-specific signature layer spans the full width
// and bleeds across every slide edge, with per-panel content on top. The editor
// windows onto it (one slide at a time) and the export slices it — both use this
// exact component, so preview, thumbnails and output always agree.
//
// Each theme picks its own signature (heroLayer), panel layout (panelKind) and
// an optional wrap-up cross-viz — so the themes read as genuinely different
// designs, not colour swaps.

import type { ActivityData } from "@/components/app/sample-data";
import type { ThemeId } from "@/components/themes";
import { PhotoLayer } from "@/components/themes/photo-layer";
import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { EffectiveStyle } from "@/lib/carousel/resolve";
import { resolveDeckStyle } from "@/lib/carousel/resolve";
import type { PanelKind } from "@/lib/carousel/theme-tokens";
import { SLIDE_H, SLIDE_W, type Slide } from "@/lib/carousel/types";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import { filterCss, NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import { CarouselPhoto } from "./carousel-photo";
import { CrossViz } from "./cross-viz";
import { ElevationBand } from "./elevation-band";
import { MicroGraphicLayer } from "./micro-graphic-layer";
import { Overlay } from "./overlay";
import { FramePanel } from "./panels/frame-panel";
import { PressPanel } from "./panels/press-panel";
import { TelemetryPanel } from "./panels/telemetry-panel";
import { RouteLine } from "./route-line";
import { SegmentsTimeline } from "./segments-timeline";
import { TEMPLATES } from "./templates";
import type { TemplateProps } from "./templates/shared";

function panelFor(
  kind: PanelKind,
  template: Slide["template"]
): (props: TemplateProps) => React.JSX.Element {
  if (kind === "frame") {
    return FramePanel;
  }
  if (kind === "telemetry") {
    return TelemetryPanel;
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
  theme: ThemeId;
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
}: SeamlessCanvasProps) {
  const total = slides.length;
  const width = total * SLIDE_W;
  const style: EffectiveStyle = resolveDeckStyle(theme, accent, photoTheme);
  const hasPhoto = Boolean(photoUrl);

  // Only photo-capable (standard) themes show the photo; Frame/Telemetry/Press
  // are type-led and stay clean. Dark standard themes are photo-forward
  // (full-bleed + white type + scrim); light ones keep it a faint texture.
  const showPhoto = hasPhoto && style.panelKind === "standard";
  const photoForeground = showPhoto && style.dark;
  const desaturate = photoForeground && style.routeStyle === "desaturated";
  const photoFilter = filterCss(photoEffects.filter);

  const profile = data.elevationProfile ?? data.paceProfile;
  const profileMode =
    (data.elevationProfile?.length ?? 0) > 1 ? "elevation" : "pace";
  const hasSegments = (data.segments?.length ?? 0) >= 2;

  const showElevationHero =
    style.heroLayer === "elevation" && (profile?.length ?? 0) > 1;
  const showSegmentsHero = style.heroLayer === "segments" && hasSegments;
  // Route is the hero for route themes, and the fallback for a Relay deck with
  // no real segments.
  const showRouteHero =
    style.heroLayer === "route" ||
    (style.heroLayer === "segments" && !hasSegments);

  const heroInk = photoForeground ? "#ffffff" : style.ink;

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
        if (!(showPhoto && photoUrl)) {
          return null;
        }
        if (imageSize) {
          return (
            <CarouselPhoto
              desaturate={desaturate}
              filter={photoFilter}
              flipH={photoEffects.flipH}
              flipV={photoEffects.flipV}
              imageSize={imageSize}
              opacity={photoForeground ? 1 : 0.16}
              photoUrl={photoUrl}
              rotate={photoEffects.rotate}
              stripH={SLIDE_H}
              stripW={width}
              transform={imageTransform}
            />
          );
        }
        return (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              opacity: photoForeground ? 1 : 0.16,
              filter: desaturate ? "saturate(0.6) brightness(1.05)" : undefined,
            }}
          >
            <PhotoLayer imageTransform={imageTransform} photoUrl={photoUrl} />
          </div>
        );
      })()}

      {photoForeground ? (
        <Overlay
          accent={style.accent}
          opacity={0.5}
          style={style.overlayStyle}
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

      {showSegmentsHero ? (
        <SegmentsTimeline
          accent={style.accent}
          accent2={style.accent2}
          data={data}
          ink={style.ink}
          monoFont={style.fonts.mono}
          mutedInk={style.mutedInk}
          numeralFont={style.fonts.numeral}
        />
      ) : null}

      {showRouteHero ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "26%",
            height: "48%",
          }}
        >
          <RouteLine
            accent={style.accent}
            accent2={style.accent2}
            coords={data.routeCoordinates}
            h={SLIDE_H * 0.48}
            ink={heroInk}
            overPhoto={photoForeground}
            pad={60}
            showMarkers
            stretch
            strokeWidth={8}
            style={style.routeStyle}
            w={width}
          />
        </div>
      ) : null}

      {/* Per-panel foreground. */}
      {slides.map((slide, i) => {
        const Panel = panelFor(style.panelKind, slide.template);
        const isLast = i === total - 1;
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
              hasPhoto={photoForeground}
              index={i}
              style={style}
              total={total}
            />
            {style.panelKind === "standard" && style.microGraphic ? (
              <MicroGraphicLayer
                color={heroInk}
                corner="tr"
                data={data}
                fonts={style.fonts}
              />
            ) : null}
            {isLast && style.crossViz ? (
              <div style={{ position: "absolute", top: 168, right: 70 }}>
                <CrossViz
                  accent={style.accent}
                  color={heroInk}
                  data={data}
                  fonts={style.fonts}
                  kind={style.crossViz}
                  muted={style.mutedInk}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
