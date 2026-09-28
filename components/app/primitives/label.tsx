"use client";

// Label treatments for the editor's form rows.

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const controlLabelVariants = cva("", {
  defaultVariants: { dimmed: false, variant: "row" },
  variants: {
    dimmed: {
      false: "",
      true: "opacity-50",
    },
    variant: {
      /** a mono, wide-tracked caps field header (text-field labels) */
      caps: "tracking-caps-xl font-mono text-xs font-medium uppercase opacity-65",
      /** a sentence-case label beside a switch (settings rows) */
      row: "text-sm font-medium",
      /** a label that wraps its own switch */
      switch: "gap-3 text-sm",
    },
  },
});

export const ControlLabel = ({
  className,
  dimmed,
  variant,
  ...props
}: ComponentProps<typeof Label> &
  VariantProps<typeof controlLabelVariants>) => (
  <Label
    className={cn(controlLabelVariants({ dimmed, variant }), className)}
    {...props}
  />
);
