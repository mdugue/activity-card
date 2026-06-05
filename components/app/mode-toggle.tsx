"use client";

// Top-level Single Card ↔ Carousel switch — a compact segmented control that
// sits inline with the wordmark in the editor's header line.

import { CardsIcon, type Icon, ImagesIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type CardMode = "single" | "carousel";

interface ModeToggleProps {
  mode: CardMode;
  onModeChange: (mode: CardMode) => void;
}

const MODES: { id: CardMode; label: string; Icon: Icon }[] = [
  { id: "carousel", label: "Carousel", Icon: ImagesIcon },
  { id: "single", label: "Single Card", Icon: CardsIcon },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <fieldset className="m-0 inline-flex border border-foreground/15 p-0.5">
      <legend className="sr-only">Card mode</legend>
      {MODES.map((m) => {
        const active = m.id === mode;
        const { Icon } = m;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-foreground/65 hover:text-foreground"
            )}
            key={m.id}
            onClick={() => onModeChange(m.id)}
            type="button"
          >
            <Icon aria-hidden className="size-4 shrink-0" weight="duotone" />
            <span className="whitespace-nowrap font-heading text-sm uppercase leading-none tracking-wide">
              {m.label}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
