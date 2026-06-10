"use client";

// Lean light/dark switch. The app defaults to the system preference (auto);
// this pins light or dark once the user opts in, persisted by next-themes.
//
// Which glyph shows is driven purely by the `.dark` class via Tailwind's
// `dark:` variant — no mounted guard, so it's SSR-safe with no hydration flash.
// `resolvedTheme` is only read inside the click handler, which can't fire until
// the provider has hydrated, so it's always defined by then.

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      aria-label="Toggle dark mode"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center border border-foreground/15 text-foreground/65 transition-colors hover:text-foreground",
        className
      )}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title="Toggle dark mode"
      type="button"
    >
      <MoonIcon aria-hidden className="size-4 dark:hidden" weight="duotone" />
      <SunIcon
        aria-hidden
        className="hidden size-4 dark:block"
        weight="duotone"
      />
    </button>
  );
}
