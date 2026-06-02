"use client";

// Top-level Single Card ↔ Carousel switch. Single Card keeps the existing flow
// untouched; Carousel swaps in the multi-slide editor.

import { cn } from "@/lib/utils";

export type CardMode = "single" | "carousel";

interface ModeToggleProps {
  mode: CardMode;
  onModeChange: (mode: CardMode) => void;
}

const MODES: { id: CardMode; label: string; sub: string }[] = [
  { id: "single", label: "Single Card", sub: "one frame" },
  { id: "carousel", label: "Carousel", sub: "swipeable set" },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <fieldset className="m-0 inline-flex border-2 border-foreground/15 p-1">
      <legend className="sr-only">Card mode</legend>
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex flex-col items-start px-4 py-2 text-left transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-foreground/70 hover:text-foreground"
            )}
            key={m.id}
            onClick={() => onModeChange(m.id)}
            type="button"
          >
            <span className="font-heading text-base uppercase leading-none tracking-wide">
              {m.label}
            </span>
            <span className="mt-1 font-medium font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">
              {m.sub}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
