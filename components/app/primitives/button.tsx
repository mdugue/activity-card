"use client";

// Project-owned Button treatments beyond the vendor variants.

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className"> & { className?: string };

/** The big display-type call to action (Get started, Open the editor). */
const ctaButtonVariants = cva("font-heading tracking-wide uppercase", {
  defaultVariants: { scale: "default" },
  variants: {
    scale: {
      /** the dialog footer hand-off */
      default: "h-11 px-6 text-base sm:h-12 sm:px-8 sm:text-lg",
      /** the landing hero: larger, lifted on a primary-tinted shadow */
      hero: "shadow-primary/50 h-auto justify-center px-8 py-4 text-2xl shadow-xl hover:-translate-y-0.5",
    },
  },
});

export const CtaButton = ({
  className,
  scale,
  size = "lg",
  ...props
}: WithClassName<ComponentProps<typeof Button>> &
  VariantProps<typeof ctaButtonVariants>) => (
  <Button
    className={cn(ctaButtonVariants({ scale }), className)}
    size={size}
    {...props}
  />
);

/** A light button that reads on top of any photo (the image-adjust overlay). */
export const PhotoOverlayButton = ({
  className,
  ...props
}: WithClassName<ComponentProps<typeof Button>>) => (
  <Button
    className={cn("bg-white/90 text-black hover:bg-white", className)}
    {...props}
  />
);
