"use client";

// Thin client boundary around next-themes so the root layout (a server
// component) can mount it. Defaults are set at the call site in app/layout.tsx.

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
