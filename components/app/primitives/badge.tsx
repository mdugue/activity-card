"use client";

// A filled Badge: the vendor Badge is a bare caps label, these give it a
// surface.

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const filledBadgeVariants = cva("", {
  defaultVariants: { tone: "inverse" },
  variants: {
    tone: {
      /** a solid foreground block (a step's status) */
      inverse: "bg-foreground text-background px-2 py-1",
      /** a solid primary block (the active step) */
      primary: "bg-primary text-primary-foreground px-2 py-1",
      /** a frosted dark pill that reads over a photo */
      scrim:
        "rounded-full bg-black/55 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-sm",
    },
  },
});

export const FilledBadge = ({
  className,
  tone,
  ...props
}: Omit<ComponentProps<typeof Badge>, "className"> & {
  className?: string;
} & VariantProps<typeof filledBadgeVariants>) => (
  <Badge className={cn(filledBadgeVariants({ tone }), className)} {...props} />
);
