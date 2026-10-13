"use client";

// Item treatments beyond the vendor variants.

import type { ComponentProps } from "react";

import { Item } from "@/components/ui/item";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className" | "render"> & {
  className?: string;
};

/** A list row that is itself a button (the Strava activity picker): an
 *  outline Item that turns primary when `selected` and dims while `disabled`.
 *  Name it with `aria-label`; base-ui puts it on the button. */
export const SelectableItem = ({
  className,
  disabled,
  selected = false,
  ...props
}: WithClassName<ComponentProps<typeof Item>> & {
  disabled?: boolean;
  selected?: boolean;
}) => (
  <Item
    className={cn(
      "not-disabled:hover:bg-muted data-selected:border-primary data-selected:bg-primary/5 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    data-selected={selected ? "" : undefined}
    // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the Item's aria-label, which base-ui renders onto this button
    render={<button disabled={disabled} type="button" />}
    variant="outline"
    {...props}
  />
);
