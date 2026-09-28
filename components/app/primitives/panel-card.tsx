"use client";

// A Card for a step/panel in a flow: tighter section rhythm, a primary ring
// while it is the active one, and a title that sits beside a leading marker.

import type { ComponentProps } from "react";

import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const PanelCard = ({
  active = false,
  className,
  ...props
}: ComponentProps<typeof Card> & { active?: boolean }) => (
  <Card
    className={cn("gap-4", active && "ring-primary ring-2", className)}
    {...props}
  />
);

/** A card title with an inline leading marker (a step number, an icon). */
export const PanelCardTitle = ({
  className,
  ...props
}: ComponentProps<typeof CardTitle>) => (
  <CardTitle className={cn("flex items-center gap-2", className)} {...props} />
);
