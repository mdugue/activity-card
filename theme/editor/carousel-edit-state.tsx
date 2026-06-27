"use client";

// Carousel editor. The large preview is a horizontally scroll-snapped window
// onto the single CarouselDeck — it shows one slide at a time and swiping
// reveals the neighbours with the seamless bleed, exactly like an Instagram /
// Strava carousel. The slide strip below windows onto the same canvas. The
// controls reuse the shared ControlDeck (focused toolbar on mobile, horizontal
// sidebar on desktop); image crop/zoom reuses the single-card adjust overlay,
// deck-wide. Export navigates to the shared overview (CarouselExportSheet) — the
// same flow as the single card — rather than downloading inline.

import { ImagesIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { CardStage } from "@/components/app/card-stage";
import { ControlDeck, PANEL_MOTION } from "@/components/app/control-deck";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CarouselController } from "@/hooks/use-carousel";
import { cn } from "@/lib/utils";
import { CarouselDeck } from "@/theme/carousel/deck";
import { stripGeometry } from "@/theme/carousel/geometry";
import {
  CAROUSEL_THEME_ORDER,
  CAROUSEL_THEMES,
  type CarouselThemeId,
} from "@/theme/carousel/registry";
import type { ExportFormat, ExportFormatId } from "@/theme/core/export-formats";
import { useActivityTools } from "./activity-tools";
import type { EditorSession } from "./editor-session";
import { FormatControl } from "./format-control";
import { AdjustControls, usePhotoAdjust } from "./photo-adjust";
import { SafeZoneOverlay } from "./safe-zone-overlay";
import { SlideStrip } from "./slide-strip";
import { ThemeRail } from "./theme-rail";

interface CarouselEditStateProps {
  carousel: CarouselController;
  /** the active export format (shared with single-card) */
  format: ExportFormat;
  /** open the export overview (CarouselExportSheet) — the same deliberate step
   *  as the single card; never an inline download */
  onExport: () => void;
  onFormatChange: (id: ExportFormatId) => void;
  onThemeChange: (theme: CarouselThemeId) => void;
  session: EditorSession;
  theme: CarouselThemeId;
}

export function CarouselEditState({
  carousel,
  session,
  theme,
  format,
  onExport,
  onFormatChange,
  onThemeChange,
}: CarouselEditStateProps) {
  const { data, visibility, color, config, photo } = session;
  const { count, selectedIndex } = carousel;
  const descriptor = CAROUSEL_THEMES[theme];
  // The strip, every deck mount and the export all size from this one geometry —
  // no parallel literals. The carousel offers the same formats as the single
  // card, so the shared preview format flows straight through.
  const { slideW, slideH, stripW } = stripGeometry(format, count);

  const viewportRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // While we programmatically scroll to a selected slide we ignore the scroll
  // handler, so a slow/janky animation can't read an intermediate position and
  // redirect selection.
  const programmatic = useRef(false);
  const targetLeft = useRef(0);
  // Latest selected index, read by the ResizeObserver below without making it a
  // dependency (re-subscribing on every selection change would be wasteful).
  const selectedIndexRef = useRef(selectedIndex);
  // The safe-zone guide is an editor-only preview overlay; the FORMAT control
  // toggles it and the preview reads it — the same mechanism as the single card.
  const [showSafe, setShowSafe] = useState(false);

  // Pan/zoom against the whole strip's box (true-cover panorama). `imageSize`
  // also feeds the deck + slide strip; `adjusting` gates the scroll-snap below.
  const adjust = usePhotoAdjust({
    boxW: stripW,
    boxH: slideH,
    enabled: visibility.photoBackdrop,
    photoUrl: photo.url,
    rotate: photo.effects.rotate,
  });
  const { adjusting, imageSize } = adjust;

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
      if (idx >= 0 && idx < count) {
        carousel.select(idx);
      }
    }, 120);
  };

  const deckProps = {
    colors: color.scheme,
    config: config.value,
    data,
    format,
    imageSize,
    imageTransform: photo.transform,
    photoEffects: photo.effects,
    photoUrl: photo.url,
    theme: descriptor,
    visibility,
  };

  const tools = useActivityTools({
    mode: "carousel",
    session,
    themeControl: (
      <ThemeRail
        labels={CAROUSEL_THEMES}
        onThemeChange={onThemeChange}
        order={CAROUSEL_THEME_ORDER}
        theme={theme}
      />
    ),
  });

  const preview = (
    // Fill the preview area on the mobile app-shell so the seamless window can
    // scale to fit the space it's given; on desktop it's a fixed-width column.
    <div className="flex min-w-0 flex-col gap-3 max-lg:min-h-0 max-lg:flex-1 lg:gap-5">
      {/* The scroll-snap window onto the seamless canvas is the card box; the
          stage scales it to fit the toolbar-shrunk space on mobile. */}
      <CardStage
        aspectRatio={slideW / slideH}
        maxWidthClassName="max-w-[360px]"
      >
        <div
          className="@container relative w-full overflow-x-auto overflow-y-hidden bg-white shadow-[0_24px_50px_-14px_rgba(26,23,20,0.3)]"
          data-testid="carousel-preview"
          onScroll={handleScroll}
          ref={viewportRef}
          style={{
            aspectRatio: `${slideW} / ${slideH}`,
            scrollSnapType: adjusting ? "none" : "x mandatory",
            overflowX: adjusting ? "hidden" : "auto",
          }}
        >
          <div
            className="relative h-full"
            style={{ width: `calc(100cqw * ${count})` }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: stripW,
                height: slideH,
                transform: `scale(calc(100cqw / ${slideW}px))`,
              }}
            >
              <CarouselDeck {...deckProps} />
              {/* Per-slide keep-out guide (display-only — never on the export
                  mount below). Each slide is one format box in strip space. */}
              {showSafe
                ? Array.from({ length: count }, (_, i) => (
                    <div
                      aria-hidden
                      // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional — the index IS the identity (fixed count, never reordered)
                      key={`safe-${i}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: i * slideW,
                        width: slideW,
                        height: slideH,
                      }}
                    >
                      <SafeZoneOverlay format={format} scale={1} />
                    </div>
                  ))
                : null}
            </div>
            <div className="absolute inset-0 flex">
              {Array.from({ length: count }, (_, i) => (
                <div
                  aria-hidden
                  // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional — the index IS the identity (fixed count, never reordered)
                  key={`snap-${i}`}
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

        <AdjustControls
          adjust={adjust}
          contentWidth={slideW}
          label="Adjust photo"
          onChange={photo.onTransformChange}
          transform={photo.transform}
        />
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
          colors={color.scheme}
          config={config.value}
          data={data}
          format={format}
          imageSize={imageSize}
          imageTransform={photo.transform}
          onSelect={carousel.select}
          photoEffects={photo.effects}
          photoUrl={photo.url}
          selectedIndex={selectedIndex}
          theme={descriptor}
          visibility={visibility}
        />
      </div>
    </div>
  );

  return (
    <TooltipProvider delay={200}>
      <ControlDeck
        action={{
          icon: <ImagesIcon aria-hidden className="size-5" weight="duotone" />,
          label: "Export carousel",
          meta: `${count} × ${format.width}×${format.height}`,
          onAction: onExport,
        }}
        preview={preview}
        previewControl={
          <FormatControl
            format={format}
            onFormatChange={onFormatChange}
            onShowSafeChange={setShowSafe}
            showSafe={showSafe}
          />
        }
        tools={tools}
      />
    </TooltipProvider>
  );
}
