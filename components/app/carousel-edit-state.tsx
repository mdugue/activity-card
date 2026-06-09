"use client";

// Carousel editor. The large preview is a horizontally scroll-snapped window
// onto the single SeamlessCanvas — it shows one slide at a time and swiping
// reveals the neighbours with the seamless bleed, exactly like an Instagram /
// Strava carousel. The slide strip below windows onto the same canvas, and the
// off-screen full-width mount feeds the slicing export — so preview, thumbnails
// and output are guaranteed to match. The controls reuse the shared ControlDeck
// (focused toolbar on mobile, horizontal sidebar on desktop); image crop/zoom
// reuses the single-card adjust overlay, deck-wide.

import { ArrowsOutCardinalIcon, ImagesIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { SeamlessCanvas } from "@/components/carousel/seamless-canvas";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CarouselController } from "@/hooks/use-carousel";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import {
  CAROUSEL_THEME_LABELS,
  CAROUSEL_THEME_ORDER,
  CAROUSEL_THEME_TOKENS,
  type CarouselThemeId,
} from "@/lib/carousel/theme-tokens";
import { carouselBaseName, exportCarousel } from "@/lib/export-carousel";
import {
  clampCoverTransform,
  type ImageTransform,
} from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import type { ParsedActivity } from "@/lib/parse-activity";
import { isQuarterTurn, type PhotoEffects } from "@/lib/photo-effects";
import type { StrataConfig } from "@/lib/strata";
import type { Visibility } from "@/lib/visibility";
import { useActivityTools } from "./activity-tools";
import { ControlDeck } from "./control-deck";
import { ImageAdjustOverlay } from "./image-adjust-overlay";
import {
  PhotoFilterControl,
  PhotoTransformControls,
} from "./photo-effects-controls";
import type { ActivityData, Sport } from "./sample-data";
import { SlideStrip } from "./slide-strip";
import { StrataControls } from "./strata-controls";
import { ThemeRail } from "./theme-rail";

interface CarouselEditStateProps {
  accent: string;
  athleteName: string;
  available: Record<keyof Visibility, boolean>;
  carousel: CarouselController;
  data: ActivityData;
  imageTransform: ImageTransform;
  location: string;
  onAccentChange: (accent: string) => void;
  onAthleteNameChange: (name: string) => void;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onImageTransformChange: (next: ImageTransform) => void;
  onLocationChange: (location: string) => void;
  onOpenStravaPicker: () => void;
  onPhotoChange: (file: File | null) => void;
  onPhotoEffectsChange: (next: PhotoEffects) => void;
  onSportChange: (sport: Sport) => void;
  onStrataConfigChange: (config: StrataConfig) => void;
  onThemeChange: (theme: CarouselThemeId) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  photoEffects: PhotoEffects;
  photoPaletteTheme: PaletteTheme | null;
  photoUrl: string | null;
  strataConfig: StrataConfig;
  theme: CarouselThemeId;
  title: string;
  visibility: Visibility;
}

export function CarouselEditState(props: CarouselEditStateProps) {
  const {
    carousel,
    data,
    theme,
    photoUrl,
    imageTransform,
    photoEffects,
    photoPaletteTheme,
  } = props;
  const { slides, selectedId, selectedIndex } = carousel;

  // Photo support is per-theme: every carousel theme now renders a background
  // photo (the type-led Frame/Press keep it clean via shadows / opaque boxes),
  // so derive it from the theme token rather than the panel kind.
  const photoSupported = CAROUSEL_THEME_TOKENS[theme].photoSupported;

  const viewportRef = useRef<HTMLDivElement>(null);
  const wideRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // While we programmatically scroll to a selected slide we ignore the scroll
  // handler, so a slow/janky animation can't read an intermediate position and
  // redirect selection.
  const programmatic = useRef(false);
  const targetLeft = useRef(0);
  const [isExporting, setIsExporting] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  // Natural photo size → true-cover, pannable panorama + a clamp that respects
  // the wide strip's real vertical overflow. A quarter-turn swaps the photo's
  // width/height, so the clamp must use the rotated dimensions.
  const imageSize = useImageNaturalSize(photoUrl);
  const stripW = slides.length * 1080;
  const quarter = isQuarterTurn(photoEffects.rotate);
  const coverClamp = imageSize
    ? (t: ImageTransform) =>
        clampCoverTransform(
          t,
          stripW,
          1350,
          quarter ? imageSize.h : imageSize.w,
          quarter ? imageSize.w : imageSize.h
        )
    : undefined;

  // Adjust only makes sense when the theme renders the photo AND we know its
  // natural size — the pan/zoom clamp (coverClamp) is derived from imageSize,
  // so offering Adjust before it resolves would pan against the wrong bounds.
  const adjustAvailable =
    photoUrl !== null && photoSupported && imageSize !== null;
  useEffect(() => {
    if (adjusting && !adjustAvailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdjusting(false);
    }
  }, [adjusting, adjustAvailable]);

  // Scroll the preview window to the selected slide when selection changes
  // from elsewhere (thumbnail click, add/remove). Flag it as programmatic so
  // the scroll handler ignores the animation; a fallback timeout clears the
  // flag in case the smooth scroll never lands exactly on target.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) {
      return;
    }
    const target = selectedIndex * vp.clientWidth;
    if (Math.abs(vp.scrollLeft - target) <= 2) {
      return;
    }
    programmatic.current = true;
    targetLeft.current = target;
    vp.scrollTo({ left: target, behavior: "smooth" });
    const t = setTimeout(() => {
      programmatic.current = false;
    }, 700);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  // A manual swipe selects the slide it settles on (debounced). Ignored while a
  // programmatic scroll is in flight (cleared once it reaches its target).
  const handleScroll = () => {
    const vp = viewportRef.current;
    if (!vp) {
      return;
    }
    if (programmatic.current) {
      if (Math.abs(vp.scrollLeft - targetLeft.current) < 2) {
        programmatic.current = false;
      }
      return;
    }
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
    }
    settleTimer.current = setTimeout(() => {
      const idx = Math.round(vp.scrollLeft / vp.clientWidth);
      const id = slides[idx]?.id;
      if (id) {
        carousel.select(id);
      }
    }, 120);
  };

  const handleExport = async () => {
    if (isExporting || !wideRef.current) {
      return;
    }
    setIsExporting(true);
    try {
      await exportCarousel(
        wideRef.current,
        slides.length,
        carouselBaseName(data.sport, data.date)
      );
    } finally {
      setIsExporting(false);
    }
  };

  const canvasProps = {
    accent: props.accent,
    data,
    imageSize,
    imageTransform,
    photoEffects,
    photoTheme: photoPaletteTheme,
    photoUrl,
    slides,
    strataConfig: props.strataConfig,
    theme,
    visibility: props.visibility,
  };

  const photoEditable = photoUrl !== null && photoSupported;

  // STRATA carousel exposes the same mood / density / legend panel as the
  // single card; other carousel themes have no per-theme parameters.
  const moodControl =
    theme === "strata" ? (
      <StrataControls
        config={props.strataConfig}
        onChange={props.onStrataConfigChange}
      />
    ) : undefined;

  const tools = useActivityTools({
    accent: props.accent,
    athleteName: props.athleteName,
    available: props.available,
    data,
    defaultAccent: CAROUSEL_THEME_TOKENS[theme].accent,
    filterControl: photoEditable ? (
      <PhotoFilterControl
        effects={photoEffects}
        onChange={props.onPhotoEffectsChange}
      />
    ) : undefined,
    location: props.location,
    mode: "carousel",
    onAccentChange: props.onAccentChange,
    onAthleteNameChange: props.onAthleteNameChange,
    onFilesLoaded: props.onFilesLoaded,
    onLocationChange: props.onLocationChange,
    onOpenStravaPicker: props.onOpenStravaPicker,
    moodControl,
    onPhotoChange: props.onPhotoChange,
    onSportChange: props.onSportChange,
    onTitleChange: props.onTitleChange,
    onVisibilityChange: props.onVisibilityChange,
    photoExtras: photoEditable ? (
      <PhotoTransformControls
        allowRotate
        effects={photoEffects}
        onChange={props.onPhotoEffectsChange}
      />
    ) : null,
    photoSupported,
    photoUrl,
    themeControl: (
      <ThemeRail
        labels={CAROUSEL_THEME_LABELS}
        onThemeChange={props.onThemeChange}
        order={CAROUSEL_THEME_ORDER}
        theme={theme}
      />
    ),
    themeLabel: CAROUSEL_THEME_LABELS[theme].label,
    title: props.title,
    visibility: props.visibility,
  });

  const preview = (
    <div className="flex min-w-0 flex-col gap-5">
      {/* Scroll-snap window onto the seamless canvas. */}
      <div className="relative mx-auto w-full max-w-[360px]">
        <div
          className="@container relative aspect-[1080/1350] w-full overflow-x-auto overflow-y-hidden bg-white shadow-[0_24px_50px_-14px_rgba(26,23,20,0.3)]"
          data-testid="carousel-preview"
          onScroll={handleScroll}
          ref={viewportRef}
          style={{
            scrollSnapType: adjusting ? "none" : "x mandatory",
            overflowX: adjusting ? "hidden" : "auto",
          }}
        >
          <div
            className="relative h-full"
            style={{ width: `calc(100cqw * ${slides.length})` }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: 1080 * slides.length,
                height: 1350,
                transform: "scale(calc(100cqw / 1080px))",
              }}
            >
              <SeamlessCanvas {...canvasProps} />
            </div>
            <div className="absolute inset-0 flex">
              {slides.map((s) => (
                <div
                  aria-hidden
                  key={s.id}
                  style={{
                    flex: "0 0 100cqw",
                    width: "100cqw",
                    scrollSnapAlign: "start",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {adjustAvailable && !adjusting ? (
          <Badge
            className="absolute top-3 right-3 z-10 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[10px] text-white backdrop-blur-sm transition-colors hover:bg-black/75"
            render={<button onClick={() => setAdjusting(true)} type="button" />}
          >
            <ArrowsOutCardinalIcon
              aria-hidden
              className="size-3"
              weight="duotone"
            />
            Adjust photo
          </Badge>
        ) : null}

        {adjusting ? (
          <ImageAdjustOverlay
            clamp={coverClamp}
            onChange={props.onImageTransformChange}
            onDone={() => setAdjusting(false)}
            transform={imageTransform}
          />
        ) : null}
      </div>

      <SlideStrip
        accent={props.accent}
        data={data}
        imageSize={imageSize}
        imageTransform={imageTransform}
        onSelect={carousel.select}
        photoEffects={photoEffects}
        photoTheme={photoPaletteTheme}
        photoUrl={photoUrl}
        selectedId={selectedId}
        slides={slides}
        strataConfig={props.strataConfig}
        theme={theme}
        visibility={props.visibility}
      />
    </div>
  );

  return (
    <TooltipProvider delay={200}>
      <ControlDeck
        action={{
          icon: <ImagesIcon aria-hidden className="size-5" weight="duotone" />,
          isBusy: isExporting,
          label: "Export carousel",
          meta: `${slides.length} × 1080×1350`,
          onAction: handleExport,
        }}
        preview={preview}
        tools={tools}
      >
        {/* Off-screen full-width mount used by the slicing export. */}
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 -z-10"
          style={{ transform: "translateX(-200%)" }}
        >
          <div
            ref={wideRef}
            style={{ width: slides.length * 1080, height: 1350 }}
          >
            <SeamlessCanvas {...canvasProps} />
          </div>
        </div>
      </ControlDeck>
    </TooltipProvider>
  );
}
