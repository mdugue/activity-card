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
import { SeamlessCanvas } from "@/components/themes/carousel/seamless-canvas";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CarouselController } from "@/hooks/use-carousel";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ActivityData, Sport } from "@/lib/activity";
import {
  CAROUSEL_THEME_LABELS,
  CAROUSEL_THEME_ORDER,
  CAROUSEL_THEME_TOKENS,
  type CarouselThemeId,
} from "@/lib/carousel/theme-tokens";
import type { ColorChoice, ColorScheme } from "@/lib/colors";
import { carouselBaseName, exportCarousel } from "@/lib/export-carousel";
import {
  clampCoverTransform,
  type ImageTransform,
} from "@/lib/image-transform";
import type { ExtractedPalette } from "@/lib/palette";
import type { ParamDef } from "@/lib/params/kinds";
import type { ParsedActivity } from "@/lib/parse-activity";
import { isQuarterTurn, type PhotoEffects } from "@/lib/photo-effects";
import type { StrataConfig } from "@/lib/strata";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/visibility";
import { useActivityTools } from "./activity-tools";
import { CardStage } from "./card-stage";
import { ControlDeck, PANEL_MOTION } from "./control-deck";
import { ImageAdjustOverlay } from "./image-adjust-overlay";
import { SlideStrip } from "./slide-strip";
import { ThemeRail } from "./theme-rail";

interface CarouselEditStateProps {
  athleteName: string;
  available: Record<keyof Visibility, boolean>;
  carousel: CarouselController;
  /** the effective colour choice (theme default until the user picks) */
  colorChoice: ColorChoice;
  /** true while the user hasn't customised the colour */
  colorIsDefault: boolean;
  /** the resolved colour scheme the deck renders with */
  colors: ColorScheme;
  /** the active carousel theme's coerced parameter config (StrataConfig for the
   *  STRATA carousel; {} for the rest) */
  config: Record<string, unknown>;
  data: ActivityData;
  imageTransform: ImageTransform;
  location: string;
  onAthleteNameChange: (name: string) => void;
  onColorChoiceChange: (choice: ColorChoice | null) => void;
  onConfigChange: (next: Record<string, unknown>) => void;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onImageTransformChange: (next: ImageTransform) => void;
  onLocationChange: (location: string) => void;
  onOpenStravaPicker: () => void;
  onPhotoChange: (file: File | null) => void;
  onPhotoEffectsChange: (next: PhotoEffects) => void;
  onSportChange: (sport: Sport) => void;
  onThemeChange: (theme: CarouselThemeId) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  /** all five palette presets — colour-control swatches + calculated params */
  paramPalette: ExtractedPalette | null;
  photoEffects: PhotoEffects;
  photoUrl: string | null;
  theme: CarouselThemeId;
  /** the active carousel theme's parameter schema */
  themeParams: ParamDef[];
  title: string;
  visibility: Visibility;
}

export function CarouselEditState(props: CarouselEditStateProps) {
  const { carousel, data, theme, photoUrl, imageTransform, photoEffects } =
    props;
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
  // Latest selected index, read by the ResizeObserver below without making it a
  // dependency (re-subscribing on every selection change would be wasteful).
  const selectedIndexRef = useRef(selectedIndex);
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
    selectedIndexRef.current = selectedIndex;
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

  // Keep the selected slide pinned to its snap point when the preview window
  // resizes — opening/closing the focused toolbar changes its width, and the
  // scroll offset is in pixels, so a width change otherwise strands it between
  // slides. Re-pin instantly (we're mid layout change, not navigating).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) {
      return;
    }
    let lastWidth = vp.clientWidth;
    const ro = new ResizeObserver(() => {
      const width = vp.clientWidth;
      if (width === 0 || width === lastWidth) {
        return;
      }
      lastWidth = width;
      // Deliberately DON'T flag this as a programmatic scroll. A re-pin only ever
      // moves to the *already selected* slide, so the scroll it triggers makes
      // handleScroll settle on that same slide — a no-op select. Setting the
      // `programmatic` guard here was fragile: if the resulting scrollLeft never
      // landed exactly on target (sub-pixel snap on touch, or a 0→0 no-op on
      // slide 0) the flag stayed stuck and every later swipe was ignored.
      const left = selectedIndexRef.current * width;
      if (Math.abs(vp.scrollLeft - left) > 1) {
        vp.scrollLeft = left;
      }
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

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
    colors: props.colors,
    data,
    imageSize,
    imageTransform,
    photoEffects,
    photoUrl,
    slides,
    strataConfig: props.config as StrataConfig,
    theme,
    visibility: props.visibility,
  };

  const tools = useActivityTools({
    athleteName: props.athleteName,
    available: props.available,
    colorAdjustable: true,
    colorChoice: props.colorChoice,
    colorIsDefault: props.colorIsDefault,
    data,
    location: props.location,
    mode: "carousel",
    onAthleteNameChange: props.onAthleteNameChange,
    onColorChoiceChange: props.onColorChoiceChange,
    onFilesLoaded: props.onFilesLoaded,
    onLocationChange: props.onLocationChange,
    onOpenStravaPicker: props.onOpenStravaPicker,
    onPhotoChange: props.onPhotoChange,
    onPhotoEffectsChange: props.onPhotoEffectsChange,
    onSportChange: props.onSportChange,
    onThemeConfigChange: props.onConfigChange,
    onTitleChange: props.onTitleChange,
    onVisibilityChange: props.onVisibilityChange,
    paramCtx: { data, palette: props.paramPalette },
    photoAllowRotate: true,
    photoEffects,
    photoUrl,
    themeConfig: props.config,
    themeControl: (
      <ThemeRail
        labels={CAROUSEL_THEME_LABELS}
        onThemeChange={props.onThemeChange}
        order={CAROUSEL_THEME_ORDER}
        theme={theme}
      />
    ),
    themeParams: props.themeParams,
    title: props.title,
    visibility: props.visibility,
  });

  const preview = (
    // Fill the preview area on the mobile app-shell so the seamless window can
    // scale to fit the space it's given; on desktop it's a fixed-width column.
    <div className="flex min-w-0 flex-col gap-3 max-lg:min-h-0 max-lg:flex-1 lg:gap-5">
      {/* The scroll-snap window onto the seamless canvas is the card box; the
          stage scales it to fit the toolbar-shrunk space on mobile. */}
      <CardStage maxWidthClassName="max-w-[360px]">
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
      </CardStage>

      {/* Slide rail — collapses (fades + zips up) while a control panel is open
          on mobile, and is hidden outright in landscape where the short viewport
          has no room for both it and a decent-sized card (you can still swipe the
          preview to navigate). Always shown on desktop. Visibility flips after
          the collapse so the hidden thumbnails aren't focusable/clickable. */}
      <div
        className={cn(
          "shrink-0 max-lg:visible max-lg:max-h-36 max-lg:overflow-hidden max-lg:opacity-100",
          PANEL_MOTION,
          "max-lg:landscape:hidden",
          "group-data-[open]/deck:max-lg:invisible group-data-[open]/deck:max-lg:max-h-0 group-data-[open]/deck:max-lg:opacity-0"
        )}
      >
        <SlideStrip
          colors={props.colors}
          data={data}
          imageSize={imageSize}
          imageTransform={imageTransform}
          onSelect={carousel.select}
          photoEffects={photoEffects}
          photoUrl={photoUrl}
          selectedId={selectedId}
          slides={slides}
          strataConfig={props.config as StrataConfig}
          theme={theme}
          visibility={props.visibility}
        />
      </div>
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
