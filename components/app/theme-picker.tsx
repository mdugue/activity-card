"use client";

// The theme selector used below the preview in BOTH Single Card and Carousel
// modes: the current theme as a button that opens a popover (desktop) / drawer
// (mobile) with the full theme grid. Extracted from the single-card theme
// carousel so the two modes share one control.

import { ChevronDown } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import {
  THEME_META,
  THEME_ORDER,
  type ThemeId,
} from "@/components/themes/index";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

interface ThemeLabel {
  label: string;
  tagline: string;
}

interface ThemePickerProps {
  /** label/tagline per theme; defaults to the Single Card names */
  labels?: Record<ThemeId, ThemeLabel>;
  onThemeChange: (theme: ThemeId) => void;
  theme: ThemeId;
}

export function ThemePicker({
  theme,
  onThemeChange,
  labels = THEME_META,
}: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const meta = labels[theme];

  const themeList = (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {THEME_ORDER.map((id) => {
        const m = labels[id];
        const active = id === theme;
        return (
          <button
            className={cn(
              "group flex flex-col items-start gap-1 border-2 px-4 py-3 text-left transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/15 hover:border-foreground/45"
            )}
            key={id}
            onClick={() => {
              onThemeChange(id);
              setOpen(false);
            }}
            type="button"
          >
            <span className="font-heading text-xl uppercase leading-none">
              {m.label}
            </span>
            <span className="caption-micro">{m.tagline}</span>
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={setOpen} open={open}>
        <DrawerTrigger asChild>
          <ThemeNameButton meta={meta} />
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
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        nativeButton={false}
        render={<ThemeNameButton meta={meta} />}
      />
      <PopoverContent align="center" className="w-[420px] p-3">
        <div className="caption-label mb-2">Themes</div>
        {themeList}
      </PopoverContent>
    </Popover>
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
    {...props}
  >
    <span className="text-left">
      <span className="block font-heading text-2xl uppercase leading-none">
        {meta.label}
      </span>
      <span className="caption-micro mt-1 block">{meta.tagline}</span>
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

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
}
