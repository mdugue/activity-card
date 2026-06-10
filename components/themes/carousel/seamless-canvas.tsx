// The carousel renderer — the single source of truth. One continuous wide strip
// (n×1080 × 1350): a theme-specific signature layer spans the full width and
// bleeds across every slide edge, with per-panel content on top. The editor
// windows onto it (one slide at a time) and the export slices it — both use this
// exact component, so preview, thumbnails and output always agree.
//
// Each theme picks its own signature (heroLayer), panel layout (panelKind), hero
// metric and an optional wrap-up cross-viz — so the themes read as genuinely
// different designs, not colour swaps.

import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import { pickProfile } from "@/lib/carousel/profile";
import {
  type EffectiveStyle,
  readableOn,
  resolveDeckStyle,
} from "@/lib/carousel/resolve";
import { heroStat, planSlideStats } from "@/lib/carousel/stats";
import type { CarouselThemeId, PanelKind } from "@/lib/carousel/theme-tokens";
import { SLIDE_H, SLIDE_W, type Slide } from "@/lib/carousel/types";
import type { ColorScheme } from "@/lib/colors";
import type { ImageTransform } from "@/lib/image-transform";
import {
  isMultiActivity,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";
import { NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import {
  DEFAULT_STRATA_CONFIG,
  STRATA_MOODS,
  type StrataConfig,
} from "@/lib/strata";
import { DEFAULT_VISIBILITY, type Visibility } from "@/lib/visibility";
import { CarouselPhoto } from "./carousel-photo";
import { ElevationBand } from "./elevation-band";
import { FramePanel } from "./panels/frame-panel";
import { PressPanel } from "./panels/press-panel";
import { RouteLine } from "./route-line";
import { StrataHero } from "./strata-canvas";
import { TEMPLATES } from "./templates";
import type { PanelProps } from "./templates/shared";

// Multi-activity project: route/elevation geometry lives per-segment, so the
// hero layers overlay every leg instead of reading the (absent) top-level
// fields. The Ascent (elevation) signature still requires real elevation legs —
// never pace data drawn as a mountain range.
function resolveHeroGeometry(
  data: ActivityData,
  heroLayer: EffectiveStyle["heroLayer"],
  picked: { mode: "elevation" | "pace"; profile: number[] | undefined }
) {
  const multi = isMultiActivity(data);
  const segProf = multi ? segmentProfiles(data) : null;
  const heroRoutes = multi ? segmentRoutes(data).map((r) => r.coords) : [];
  let showElevationHero =
    heroLayer === "elevation" &&
    picked.mode === "elevation" &&
    (picked.profile?.length ?? 0) > 1;
  if (multi) {
    showElevationHero =
      heroLayer === "elevation" &&
      Boolean(segProf?.useElevation) &&
      (segProf?.profiles.length ?? 0) > 0;
  }
  return {
    multi,
    segProf,
    heroRoutes,
    showElevationHero,
    showRouteHero: heroLayer === "route",
  };
}

function panelFor(
  kind: PanelKind,
  template: Slide["template"]
): (props: PanelProps) => React.JSX.Element {
  if (kind === "frame") {
    return FramePanel;
  }
  if (kind === "press") {
    return PressPanel;
  }
  return TEMPLATES[template];
}

/** The STRATA config (mood / density / legend) for this deck, or `null` for any
 *  other carousel theme — so the renderer can branch on one value. */
function strataConfigFor(
  theme: CarouselThemeId,
  cfg: StrataConfig | undefined
): StrataConfig | null {
  return theme === "strata" ? (cfg ?? DEFAULT_STRATA_CONFIG) : null;
}

/** STRATA's mood swaps the whole carousel palette (background gradient, ink, the
 *  two ridge colours, light/dark) so it reads like the single card's moods, not
 *  a fixed token. Any other theme (cfg `null`) passes through untouched. */
function withStrataMood(
  base: EffectiveStyle,
  cfg: StrataConfig | null
): EffectiveStyle {
  if (!cfg) {
    return base;
  }
  const m = STRATA_MOODS[cfg.mood];
  return {
    ...base,
    background: m.bg,
    ink: m.text,
    mutedInk: m.faint,
    accent: m.routeColor,
    accent2: m.elevColor,
    onAccent: readableOn(m.routeColor),
    dark: !m.inkStat,
  };
}

interface SeamlessCanvasProps {
  colors: ColorScheme;
  data: ActivityData;
  /** natural size of the photo — enables true-cover, pannable panorama */
  imageSize?: ImageSize | null;
  imageTransform?: ImageTransform | null;
  photoEffects?: PhotoEffects;
  photoUrl?: string | null;
  slides: Slide[];
  /** STRATA only: mood / density / legend (mood drives the whole palette). */
  strataConfig?: StrataConfig;
  theme: CarouselThemeId;
  /** deck-wide element visibility (toggled in the sidebar) */
  visibility?: Visibility;
}

export function SeamlessCanvas({
  data,
  slides,
  theme,
  colors,
  photoUrl,
  imageTransform,
  imageSize = null,
  photoEffects = NO_EFFECTS,
  strataConfig,
  visibility = DEFAULT_VISIBILITY,
}: SeamlessCanvasProps) {
  const total = slides.length;
  const width = total * SLIDE_W;
  // STRATA carousel is mood-driven (see withStrataMood); other themes use the
  // fixed token palette.
  const strataCfg = strataConfigFor(theme, strataConfig);
  const style: EffectiveStyle = withStrataMood(
    resolveDeckStyle(theme, colors),
    strataCfg
  );
  const hasPhoto = Boolean(photoUrl);

  // Every theme shows the photo full-bleed; legibility comes from the per-theme
  // default filter + text shadows, with only a light veil on the standard photo
  // themes. The deck-wide "Use as background" switch (visibility.photoBackdrop)
  // gates it — the same flag as the single card.
  const showPhoto = hasPhoto && visibility.photoBackdrop;
  const isStandard = style.panelKind === "standard";
  const desaturate = showPhoto && style.routeStyle === "desaturated";

  const { profile, mode: profileMode } = pickProfile(data);
  const { multi, segProf, heroRoutes, showElevationHero, showRouteHero } =
    resolveHeroGeometry(data, style.heroLayer, {
      profile,
      mode: profileMode,
    });

  // The elevation hero only renders when the project's metric is elevation
  // (see resolveHeroGeometry), but derive the mode rather than hardcoding it so
  // the band never normalises pace data as elevation if that gate ever changes.
  const heroBandMode = segProf?.useElevation ? "elevation" : "pace";
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
            effects={photoEffects}
            imageSize={imageSize}
            photoUrl={photoUrl}
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
            markerColor={heroInk}
            markerFont={style.fonts.mono}
            markers
            mode={multi ? heroBandMode : profileMode}
            profile={profile}
            profiles={multi ? segProf?.profiles : undefined}
            w={width}
            weights={multi ? segProf?.distances : undefined}
          />
        </div>
      ) : null}

      {showRouteHero ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Centred in the middle of the complete carousel viewport. RouteLine
            // projects aspect-preserving into this full-width box and centres the
            // silhouette, so the route shows at its true proportions in the
            // middle of the strip — never stretched per-axis to span the slides.
            // Compact routes concentrate around the centre slide; genuinely long
            // routes reach further across on their own.
            top: "20%",
            height: "60%",
          }}
        >
          <RouteLine
            accent={style.accent}
            accent2={style.accent2}
            coords={data.routeCoordinates}
            h={SLIDE_H * 0.6}
            ink={heroInk}
            overPhoto={showPhoto}
            pad={60}
            routes={multi ? heroRoutes : undefined}
            showMarkers
            strokeWidth={8}
            style={style.routeStyle}
            w={width}
          />
        </div>
      ) : null}

      {/* Strata signature — the woven morph-field spans the whole strip (route
          ridge top, elevation ridge bottom), with a vertical scrim so the panel
          text stays legible over the weave. */}
      {/* STRATA signature — the woven field + a mood-tinted scrim. Renders null
          for any non-STRATA deck. */}
      <StrataHero
        cfg={strataCfg}
        data={data}
        h={SLIDE_H}
        overPhoto={showPhoto}
        style={style}
        w={width}
      />

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
