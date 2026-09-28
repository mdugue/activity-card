"use client";

// The editor dock's controls: compact icon-over-label tiles on mobile that
// open out to a row on desktop. Shared by the category tabs, the format picker
// trigger (+ its popover layer) and the export action, so every tile in the
// dock has the same footprint.

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className"> & { className?: string };

/** A category tab: muted until pressed, then a solid primary tile. */
export const DockTab = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof ToggleGroupItem>>) => (
  <ToggleGroupItem
    className={cn(
      "text-foreground/55 hover:bg-foreground/5 h-auto w-14 shrink-0 flex-col gap-1 rounded-md border-0 bg-transparent px-1 py-2",
      "aria-pressed:!bg-primary aria-pressed:!text-primary-foreground data-[pressed]:!bg-primary data-[pressed]:!text-primary-foreground",
      className
    )}
    {...props}
  />
);

/** A preview-level control's trigger (e.g. the format picker): a tab-sized
 *  tile on mobile, a row from lg up; tinted while its popup is open. */
export const DockPopoverTrigger = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof PopoverTrigger>>) => (
  <PopoverTrigger
    className={cn(
      "text-foreground/60 hover:bg-foreground/5 flex h-auto w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-colors",
      "data-[popup-open]:bg-foreground/10 data-[popup-open]:text-foreground",
      "lg:w-auto lg:flex-row lg:gap-2 lg:px-4",
      className
    )}
    {...props}
  />
);

/** The layer a dock trigger opens: a tight list surface. */
export const DockPopoverContent = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof PopoverContent>>) => (
  <PopoverContent className={cn("gap-0 p-2", className)} {...props} />
);

/** The dock's primary action (export): a tab-sized tile on mobile, a wide
 *  label + meta bar from lg up. */
export const DockActionButton = ({
  className,
  size = "lg",
  ...props
}: WithClassName<ComponentProps<typeof Button>>) => (
  <Button
    className={cn(
      "h-auto w-14 shrink-0 flex-col gap-1 rounded-md px-1 py-2 lg:w-auto lg:flex-1 lg:flex-row lg:justify-between lg:px-8 lg:py-4",
      className
    )}
    size={size}
    {...props}
  />
);
