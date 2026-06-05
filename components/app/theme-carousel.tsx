"use client";

import { ArrowsOutCardinalIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ImageAdjustOverlay } from "@/components/app/image-adjust-overlay";
import { RenderTheme, type ThemeId } from "@/components/app/render-theme";
import type { ActivityData } from "@/components/app/sample-data";
import { ThemePicker } from "@/components/app/theme-picker";
import { THEME_META, THEME_ORDER } from "@/components/themes/index";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { AltitudeConfig } from "@/lib/altitude";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import { cn } from "@/lib/utils";

interface ThemeCarouselProps {
  altitudeConfig: AltitudeConfig;
  data: ActivityData;
  imageTransform: ImageTransform;
  onImageTransformChange: (next: ImageTransform) => void;
  onThemeChange: (theme: ThemeId) => void;
  photoBackdropEnabled: boolean;
  photoPaletteTheme: PaletteTheme | null;
  photoUrl: string | null;
  theme: ThemeId;
}

export function ThemeCarousel({
  data,
  onThemeChange,
  photoUrl,
  photoBackdropEnabled,
  theme,
  altitudeConfig,
  photoPaletteTheme,
  imageTransform,
  onImageTransformChange,
}: ThemeCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  // Repositioning is only meaningful when the active theme shows the photo as
  // its hero. If the user removes the photo or switches to a non-hero theme,
  // drop out of adjust mode so the locked carousel doesn't get stranded.
  const adjustAvailable =
    photoUrl !== null && THEME_META[theme].photoMode === "hero";
  useEffect(() => {
    if (adjusting && !adjustAvailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdjusting(false);
    }
  }, [adjusting, adjustAvailable]);

  // Forward swipe selections to parent state.
  useEffect(() => {
    if (!api) {
      return;
    }
    const handler = () => {
      const idx = api.selectedScrollSnap();
      const next = THEME_ORDER[idx];
      if (next && next !== theme) {
        onThemeChange(next);
      }
    };
    api.on("select", handler);
    return () => {
      api.off("select", handler);
    };
  }, [api, theme, onThemeChange]);

  // Pull external theme changes (popover, persistence, drawer) back into the
  // carousel. `scrollTo(idx, true)` jumps without animation when the change
  // didn't originate from a swipe.
  useEffect(() => {
    if (!api) {
      return;
    }
    const target = THEME_ORDER.indexOf(theme);
    if (target >= 0 && target !== api.selectedScrollSnap()) {
      api.scrollTo(target);
    }
  }, [api, theme]);

  return (
    <div className="relative flex flex-col items-stretch justify-start">
      {/* The carousel viewport clips overflow (needed for the horizontal swipe),
          so the inner `py-16` reserves room for the active card's soft shadow to
          render without being cut. The outer `-my-8` then reclaims most of that
          space so the layout stays compact — the shadow simply bleeds under the
          header above and the theme picker below rather than forcing whitespace. */}
      <Carousel
        className="-mx-6 -my-8 w-auto md:-mx-10 lg:mx-0 lg:w-full"
        opts={{
          align: "center",
          loop: true,
          containScroll: false,
          // Lock the swipe-to-switch gesture while the user repositions the
          // photo, so a one-finger drag pans the image instead of flipping
          // themes. Embla re-reads this on reInit when `adjusting` changes.
          watchDrag: !adjusting,
        }}
        setApi={setApi}
      >
        <CarouselContent className="-ml-4 py-16">
          {THEME_ORDER.map((id) => {
            const isActive = id === theme;
            return (
              <CarouselItem
                className="flex basis-[78%] justify-center pl-4 sm:basis-[64%] lg:basis-[82%]"
                key={id}
              >
                <div
                  className={cn(
                    "@container relative aspect-[1080/1350] w-full overflow-hidden bg-white transition-shadow duration-300",
                    isActive ? "shadow-2xl" : "shadow-md"
                  )}
                >
                  <div
                    className="absolute inset-0 origin-top-left"
                    style={{
                      width: 1080,
                      height: 1350,
                      transform: "scale(calc(100cqw / 1080px))",
                    }}
                  >
                    <RenderTheme
                      altitudeConfig={altitudeConfig}
                      data={data}
                      imageTransform={imageTransform}
                      photoBackdropEnabled={photoBackdropEnabled}
                      photoPaletteTheme={photoPaletteTheme}
                      photoUrl={photoUrl}
                      theme={id}
                    />
                  </div>

                  {isActive && adjustAvailable && !adjusting ? (
                    <Badge
                      className="absolute top-3 right-3 z-10 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[10px] text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                      render={
                        <button
                          onClick={() => setAdjusting(true)}
                          type="button"
                        />
                      }
                    >
                      <ArrowsOutCardinalIcon
                        aria-hidden
                        className="size-3"
                        weight="duotone"
                      />
                      Adjust
                    </Badge>
                  ) : null}

                  {isActive && adjusting ? (
                    <ImageAdjustOverlay
                      onChange={onImageTransformChange}
                      onDone={() => setAdjusting(false)}
                      transform={imageTransform}
                    />
                  ) : null}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {adjusting ? null : (
          <>
            <CarouselPrevious className="hidden lg:flex" />
            <CarouselNext className="hidden lg:flex" />
          </>
        )}
      </Carousel>

      {/* Theme name — interactive, opens picker popover/drawer */}
      <div className="mt-2 flex flex-col items-center">
        <ThemePicker
          labels={THEME_META}
          onThemeChange={onThemeChange}
          order={THEME_ORDER}
          theme={theme}
        />
        <div className="caption-micro mt-2 flex items-center gap-2">
          <span>{THEME_ORDER.indexOf(theme) + 1}</span>
          <span aria-hidden>/</span>
          <span>{THEME_ORDER.length}</span>
          <span aria-hidden className="mx-2 opacity-50">
            ·
          </span>
          <span>SWIPE OR TAP TO CHANGE</span>
        </div>
      </div>
    </div>
  );
}
