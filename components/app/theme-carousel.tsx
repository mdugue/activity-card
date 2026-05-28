"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { RenderTheme, type ThemeId } from "@/components/app/render-theme";
import type { ActivityData } from "@/components/app/sample-data";
import { THEME_META, THEME_ORDER } from "@/components/themes/index";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ThemeCarouselProps {
  data: ActivityData;
  onThemeChange: (theme: ThemeId) => void;
  photoBackdropEnabled: boolean;
  photoUrl: string | null;
  theme: ThemeId;
}

export function ThemeCarousel({
  data,
  onThemeChange,
  photoUrl,
  photoBackdropEnabled,
  theme,
}: ThemeCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const currentMeta = THEME_META[theme];

  const themeList = (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {THEME_ORDER.map((id) => {
        const meta = THEME_META[id];
        const active = id === theme;
        return (
          <button
            className={`group flex flex-col items-start gap-1 border-2 px-4 py-3 text-left transition-colors ${
              active
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/15 hover:border-foreground/45"
            }`}
            key={id}
            onClick={() => {
              onThemeChange(id);
              setPickerOpen(false);
            }}
            type="button"
          >
            <span className="font-heading text-xl uppercase leading-none">
              {meta.label}
            </span>
            <span className="font-medium font-mono text-[10px] uppercase tracking-[0.16em] opacity-65">
              {meta.tagline}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative flex flex-col items-stretch justify-start">
      <div className="mb-3 self-start px-6 font-medium font-mono text-xs tracking-[0.28em] opacity-55 md:px-10 lg:ml-14 lg:px-0">
        LIVE PREVIEW · 1080 × 1350
      </div>
      <Carousel
        className="-mx-6 w-auto md:-mx-10 lg:mx-0 lg:w-full"
        opts={{ align: "center", loop: false, containScroll: false }}
        setApi={setApi}
      >
        <CarouselContent className="-ml-4 py-10">
          {THEME_ORDER.map((id) => (
            <CarouselItem
              className="flex basis-[78%] justify-center pl-4 sm:basis-[64%] lg:basis-[82%]"
              key={id}
            >
              <div className="@container relative aspect-[1080/1350] w-full overflow-hidden bg-white shadow-[0_30px_60px_rgba(26,23,20,0.18),_0_8px_20px_rgba(26,23,20,0.08)]">
                <div
                  className="absolute inset-0 origin-top-left"
                  style={{
                    width: 1080,
                    height: 1350,
                    transform: "scale(calc(100cqw / 1080px))",
                  }}
                >
                  <RenderTheme
                    data={data}
                    photoBackdropEnabled={photoBackdropEnabled}
                    photoUrl={photoUrl}
                    theme={id}
                  />
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden lg:flex" />
        <CarouselNext className="hidden lg:flex" />
      </Carousel>

      {/* Theme name — interactive, opens picker popover/drawer */}
      <div className="mt-6 flex flex-col items-center">
        {isMobile ? (
          <Drawer onOpenChange={setPickerOpen} open={pickerOpen}>
            <DrawerTrigger asChild>
              <ThemeNameButton meta={currentMeta} />
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-60">
                  Choose a theme
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6">{themeList}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover onOpenChange={setPickerOpen} open={pickerOpen}>
            <PopoverTrigger
              nativeButton={false}
              render={<ThemeNameButton meta={currentMeta} />}
            />
            <PopoverContent align="center" className="w-[420px] p-3">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] opacity-60">
                Themes
              </div>
              {themeList}
            </PopoverContent>
          </Popover>
        )}
        <div className="mt-2 flex items-center gap-2 font-medium font-mono text-[10px] tracking-[0.22em] opacity-55">
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

const ThemeNameButton = ({
  meta,
  ref,
  ...props
}: React.ComponentProps<typeof Button> & {
  meta: { label: string; tagline: string };
}) => (
  <Button
    aria-label={`Change theme · current: ${meta.label}`}
    className="group flex h-auto items-center gap-3 border-foreground/0 border-b-2 bg-transparent px-2 py-1.5 text-foreground transition-colors hover:border-foreground/40 hover:bg-transparent data-[state=open]:border-foreground"
    data-testid="theme-picker-trigger"
    ref={ref}
    type="button"
    variant="ghost"
    {...props}
  >
    <span className="text-left">
      <span className="block font-heading text-2xl uppercase leading-none">
        {meta.label}
      </span>
      <span className="mt-1 block font-medium font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
        {meta.tagline}
      </span>
    </span>
    <ChevronDown
      aria-hidden
      className="size-4 opacity-60 transition-transform group-data-[state=open]:rotate-180"
    />
  </Button>
);
ThemeNameButton.displayName = "ThemeNameButton";

const MOBILE_QUERY = "(max-width: 639px)";

function subscribeMobile(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function useIsMobile(): boolean {
  // SSR returns false; client snapshot reflects the actual viewport.
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
}
