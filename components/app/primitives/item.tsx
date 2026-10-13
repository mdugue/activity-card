"use client";

// Item treatments beyond the vendor variants.

import type { ComponentProps } from "react";

import { Item } from "@/components/ui/item";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className"> & { className?: string };

/** A pressable list row that marks itself selected via `data-selected="true"`
 *  (the Strava activity picker). Render it as a `<button>`. */
export const SelectableItem = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof Item>>) => (
  <Item
    className={cn(
      "data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);
