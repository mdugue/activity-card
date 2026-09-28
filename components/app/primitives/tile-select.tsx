"use client";

// Select parts for a bordered-tile select (the editor's RichSelect): the
// trigger reads as a picker tile, matching the toggle pickers beside it.

import type { ComponentProps } from "react";

import { SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className"> & { className?: string };

export const TileSelectTrigger = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof SelectTrigger>>) => (
  <SelectTrigger
    className={cn(
      "border-input hover:bg-muted/40 focus-visible:ring-foreground/35 data-[popup-open]:border-foreground data-[popup-open]:bg-muted/30 !h-auto w-full items-center gap-3 px-3 py-2.5 whitespace-normal transition-colors focus-visible:ring-2",
      className
    )}
    {...props}
  />
);

/** An item with room for a two-line rich option. */
export const TileSelectItem = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof SelectItem>>) => (
  <SelectItem className={cn("py-2.5", className)} {...props} />
);
