"use client";

// Dialog treatments for full-bleed sheet dialogs (the onboarding wizard and the
// Strava picker layered over it): the content owns its own padding + sections.

import type { ComponentProps } from "react";

import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className"> & { className?: string };

/** An edge-to-edge dialog surface on the page background; its children lay
 *  out their own padding and gaps. */
export const SheetDialogContent = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DialogContent>>) => (
  <DialogContent
    className={cn("bg-background gap-0 p-0", className)}
    {...props}
  />
);

/** A display-size dialog headline. */
export const DisplayDialogTitle = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DialogTitle>>) => (
  <DialogTitle className={cn("text-2xl sm:text-3xl", className)} {...props} />
);
