"use client";

// A borderless text field with a heavy underline and display type — the
// editor's detail fields (title, location…).

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const UnderlineInput = ({
  className,
  ...props
}: ComponentProps<typeof Input>) => (
  <Input
    className={cn(
      "border-foreground font-heading h-auto border-0 border-b-2 px-0 py-1.5 text-lg tracking-tight focus-visible:ring-0",
      className
    )}
    {...props}
  />
);
