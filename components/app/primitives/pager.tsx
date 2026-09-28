"use client";

// Pagination treatments: mono page controls, and Prev/Next links that can be
// shown disabled (they are anchors, so the vendor's `disabled:` styles never
// apply).

import type { ComponentProps } from "react";

import {
  Pagination,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/** Pagination set in the mono face. */
export const Pager = ({
  className,
  ...props
}: ComponentProps<typeof Pagination>) => (
  <Pagination className={cn("font-mono", className)} {...props} />
);

type PagerStepProps = Omit<
  ComponentProps<typeof PaginationPrevious>,
  "aria-disabled"
> & {
  /** dimmed, inert and announced as disabled */
  disabled?: boolean;
};

export const PagerPrevious = ({
  className,
  disabled = false,
  ...props
}: PagerStepProps) => (
  <PaginationPrevious
    aria-disabled={disabled}
    className={cn(disabled && "pointer-events-none opacity-40", className)}
    {...props}
  />
);

export const PagerNext = ({
  className,
  disabled = false,
  ...props
}: PagerStepProps) => (
  <PaginationNext
    aria-disabled={disabled}
    className={cn(disabled && "pointer-events-none opacity-40", className)}
    {...props}
  />
);
