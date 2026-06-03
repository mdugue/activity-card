"use client";

// Carousel editor. The large preview is a horizontally scroll-snapped window
// onto the single SeamlessCanvas — it shows one slide at a time and swiping
// reveals the neighbours with the seamless bleed, exactly like an Instagram /
// Strava carousel. The slide strip below windows onto the same canvas, and the
// off-screen full-width mount feeds the slicing export — so preview, thumbnails
// and output are guaranteed to match. The sidebar reuses the single-card
// controls; image crop/zoom reuses the single-card adjust overlay, deck-wide.

import { Move } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SeamlessCanvas } from "@/components/carousel/seamless-canvas";
import type { ThemeId } from "@/components/themes";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CarouselController } from "@/hooks/use-carousel";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import {
  CAROUSEL_THEME_LABELS,
  CAROUSEL_THEME_TOKENS,
} from "@/lib/carousel/theme-tokens";
import { DECK_META, DECK_ORDER, type DeckId } from "@/lib/carousel/types";
import { carouselBaseName, exportCarousel } from "@/lib/export-carousel";
import {
  clampCoverTransform,
  type ImageTransform,
} from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import type { ParsedActivity } from "@/lib/parse-activity";
import { isQuarterTurn, type PhotoEffects } from "@/lib/photo-effects";
import type { Visibility } from "@/lib/visibility";
import { ActivityControls } from "./activity-controls";
import { EditSidebar } from "./edit-sidebar";
import { ImageAdjustOverlay } from "./image-adjust-overlay";
import { PhotoEffectsControls } from "./photo-effects-controls";
import type { ActivityData, Sport } from "./sample-data";
import { SlideStrip } from "./slide-strip";
import { ThemePicker } from "./theme-picker";

interface CarouselEditStateProps {
  accent: string;
  athleteName: string;
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
  onThemeChange: (theme: ThemeId) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  photoEffects: PhotoEffects;
  photoPaletteTheme: PaletteTheme | null;
  photoUrl: string | null;
  theme: ThemeId;
  visibility: Visibility;
}

export function CarouselEditState(props: CarouselEditStateProps) {
  const {
    carousel,
    data,
    theme,
    photoUrl,
    imageTransform,
    onImageTransformChange,
    photoEffects,
    photoPaletteTheme,
  } = props;
  const { slides, selectedId, selectedIndex } = carousel;

  // Only the photo-capable (standard panel) themes render the photo; the
  // type-led themes (Frame/Telemetry/Press) drop it in the canvas, so mirror
  // that here and disable the uploader + effects rather than showing dead
  // controls — same contract the single-card editor derives from theme meta.
  const photoSupported = CAROUSEL_THEME_TOKENS[theme].panelKind === "standard";

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

  // Keep the saved transform within the current cover bounds. Its inputs change
  // with deck length (strip width) and rotation (which swaps the photo's
  // width/height); the adjust overlay only clamps live gestures, so without
  // this a pan tuned for one geometry could reveal strip edges — and export
  // wrong framing — after switching decks or rotating.
  useEffect(() => {
    if (!imageSize) {
      return;
    }
    const clamped = clampCoverTransform(
      imageTransform,
      stripW,
      1350,
      quarter ? imageSize.h : imageSize.w,
      quarter ? imageSize.w : imageSize.h
    );
    if (
      clamped.x !== imageTransform.x ||
      clamped.y !== imageTransform.y ||
      clamped.scale !== imageTransform.scale
    ) {
      onImageTransformChange(clamped);
    }
  }, [imageSize, stripW, quarter, imageTransform, onImageTransformChange]);

  // Clear a pending settle debounce on unmount so a late timer can't select a
  // slide after the editor is gone (e.g. after a mode switch).
  useEffect(
    () => () => {
      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
      }
    },
    []
  );

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
    theme,
  };

  return (
    <div className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 gap-8 px-6 pt-6 pb-8 md:px-10 lg:grid-cols-[minmax(0,640px)_400px] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="caption-micro">
            Slide {selectedIndex + 1} / {slides.length}
          </div>
          <div className="caption-micro">SWIPE · SEAMLESS</div>
        </div>

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
              render={
                <button onClick={() => setAdjusting(true)} type="button" />
              }
            >
              <Move aria-hidden className="size-3" />
              Adjust photo
            </Badge>
          ) : null}

          {adjusting ? (
            <ImageAdjustOverlay
              clamp={coverClamp}
              onChange={onImageTransformChange}
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
          theme={theme}
        />

        {/* Deck picker — choose the story length instead of editing slides. */}
        <ToggleGroup
          aria-label="Deck"
          className="mx-auto flex gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              carousel.setDeck(values[0] as DeckId);
            }
          }}
          spacing={2}
          value={[carousel.deck]}
          variant="outline"
        >
          {DECK_ORDER.map((id) => (
            <ToggleGroupItem
              aria-label={DECK_META[id].label}
              className="flex h-auto flex-col items-start px-3 py-2 text-left"
              key={id}
              value={id}
            >
              <span className="font-heading text-sm uppercase leading-none">
                {DECK_META[id].label}
              </span>
              <span className="caption-micro mt-1">{DECK_META[id].sub}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Theme selector — same control as Single Card, below the preview,
            but showing the carousel-specific theme names. */}
        <div className="mt-1 flex flex-col items-center">
          <ThemePicker
            labels={CAROUSEL_THEME_LABELS}
            onThemeChange={props.onThemeChange}
            theme={theme}
          />
          <div className="caption-micro mt-2">TAP TO CHANGE THEME</div>
        </div>
      </div>

      <EditSidebar
        actionLabel="Export carousel"
        actionMeta={`${slides.length} × 1080×1350`}
        data={data}
        isBusy={isExporting}
        onAction={handleExport}
        onFilesLoaded={props.onFilesLoaded}
        onOpenStravaPicker={props.onOpenStravaPicker}
      >
        <ActivityControls
          accent={props.accent}
          athleteName={props.athleteName}
          caps={{
            usesAthleteName: true,
            usesLocation: true,
            usesHeartRate: true,
            // No carousel theme renders splits, so don't offer a dead toggle.
            usesSplits: false,
            photoSupported,
          }}
          data={data}
          location={props.location}
          onAccentChange={props.onAccentChange}
          onAthleteNameChange={props.onAthleteNameChange}
          onLocationChange={props.onLocationChange}
          onPhotoChange={props.onPhotoChange}
          onSportChange={props.onSportChange}
          onTitleChange={props.onTitleChange}
          onVisibilityChange={props.onVisibilityChange}
          photoExtras={
            photoUrl && photoSupported ? (
              <PhotoEffectsControls
                allowRotate
                effects={photoEffects}
                onChange={props.onPhotoEffectsChange}
              />
            ) : null
          }
          photoUrl={photoUrl}
          themeLabel={CAROUSEL_THEME_LABELS[theme].label}
          visibility={props.visibility}
        />
      </EditSidebar>

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
    </div>
  );
}
