"use client";

// Project-owned treatments for the vendored Toggle / ToggleGroup primitives —
// the editor's picker vocabulary. Call sites add layout only (margin, width,
// flex/grid placement); the look lives here.

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className"> & { className?: string };

/** A ToggleGroup that scrolls sideways on touch without showing a scrollbar
 *  (the theme rail, the mobile dock tabs). The caller adds the overflow. */
export const ScrollToggleGroup = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof ToggleGroup>>) => (
  <ToggleGroup className={cn("no-scrollbar", className)} {...props} />
);

/** An option in a picker: how its pressed state reads (`tone`) and how the
 *  option itself is laid out (`look`). */
const optionToggleVariants = cva("", {
  defaultVariants: { look: "default", tone: "default" },
  variants: {
    look: {
      /** stacked name + tagline card (the theme rail) */
      card: "border-foreground/20 hover:border-foreground/45 h-auto shrink-0 flex-col items-start gap-1 border-2 px-3.5 py-2.5 text-left whitespace-nowrap",
      /** compact mono caps chip with a leading glyph (photo filters) */
      chip: "text-2xs flex h-auto items-center gap-1.5 px-2.5 py-1.5 font-mono font-medium tracking-wide uppercase",
      /** the vendor size — keeps the toggle's own padding */
      default: "",
      /** a stacked label + blurb segment (segmented params) */
      tile: "flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left",
    },
    tone: {
      /** the vendor's muted pressed fill */
      default: "",
      /** pressed flips to a solid foreground block */
      invert:
        "data-[pressed]:!border-foreground data-[pressed]:!bg-foreground data-[pressed]:!text-background",
    },
  },
});

type OptionVariantProps = VariantProps<typeof optionToggleVariants>;

export const OptionToggleItem = ({
  className,
  look,
  tone,
  ...props
}: WithClassName<ComponentProps<typeof ToggleGroupItem>> &
  OptionVariantProps) => (
  <ToggleGroupItem
    className={cn(optionToggleVariants({ look, tone }), className)}
    {...props}
  />
);

export const OptionToggle = ({
  className,
  look,
  tone,
  ...props
}: WithClassName<ComponentProps<typeof Toggle>> & OptionVariantProps) => (
  <Toggle
    className={cn(optionToggleVariants({ look, tone }), className)}
    {...props}
  />
);

/** A colour swatch option: a ring-selected disc, or a disc + caption tile. */
const swatchToggleVariants = cva(
  "ring-foreground ring-offset-background size-9 rounded-full border-2 border-transparent p-0 ring-offset-2 transition-transform outline-none data-[pressed]:scale-110 data-[pressed]:ring-2",
  {
    defaultVariants: { look: "disc" },
    variants: {
      look: {
        disc: "",
        tile: "h-auto w-auto flex-col gap-1 rounded-md px-1.5 py-1.5",
      },
    },
  }
);

export const SwatchToggleItem = ({
  className,
  look,
  ...props
}: WithClassName<ComponentProps<typeof ToggleGroupItem>> &
  VariantProps<typeof swatchToggleVariants>) => (
  <ToggleGroupItem
    className={cn(swatchToggleVariants({ look }), className)}
    {...props}
  />
);
