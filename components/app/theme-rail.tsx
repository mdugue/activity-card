"use client";

// The theme selector: a horizontally-scrolling rail of toggle buttons rendered
// directly in the THEME control section (no popup) — it scrolls on mobile and
// wraps on desktop. Generic over the theme id type so both Single Card
// (`ThemeId`) and Carousel (`CarouselThemeId`) share it; the caller passes the
// labels + order for its id space.

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface ThemeLabel {
  label: string;
  tagline: string;
}

interface ThemeRailProps<T extends string> {
  /** label/tagline per theme id */
  labels: Record<T, ThemeLabel>;
  onThemeChange: (theme: T) => void;
  /** picker order */
  order: T[];
  theme: T;
}

export function ThemeRail<T extends string>({
  theme,
  onThemeChange,
  labels,
  order,
}: ThemeRailProps<T>) {
  return (
    <ToggleGroup
      aria-label="Theme"
      className="no-scrollbar mt-2 flex max-w-full justify-start overflow-x-auto lg:flex-wrap lg:overflow-visible"
      onValueChange={(values) => {
        if (values[0]) {
          onThemeChange(values[0] as T);
        }
      }}
      spacing={2}
      value={[theme]}
    >
      {order.map((id) => (
        <ToggleGroupItem
          className={cn(
            "h-auto shrink-0 flex-col items-start gap-1 whitespace-nowrap border-2 border-foreground/20 px-3.5 py-2.5 text-left",
            "hover:border-foreground/45",
            "data-pressed:!bg-foreground data-pressed:!text-background data-pressed:border-foreground!"
          )}
          key={id}
          value={id}
        >
          <span className="font-heading text-base uppercase leading-none tracking-wide">
            {labels[id].label}
          </span>
          <span className="font-medium font-mono text-[9px] uppercase tracking-[0.12em] opacity-60">
            {labels[id].tagline}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
