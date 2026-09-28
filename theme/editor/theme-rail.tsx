"use client";

// The theme selector: a horizontally-scrolling rail of toggle buttons rendered
// directly in the THEME control section (no popup) — it scrolls on mobile and
// wraps on desktop. Generic over the theme id type so both Single Card
// (`ThemeId`) and Carousel (`CarouselThemeId`) share it; the caller passes the
// labels + order for its id space.

import {
  OptionToggleItem,
  ScrollToggleGroup,
} from "@/components/app/primitives/toggle-group";

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

export const ThemeRail = <T extends string>({
  theme,
  onThemeChange,
  labels,
  order,
}: ThemeRailProps<T>) => (
  <ScrollToggleGroup
    aria-label="Theme"
    className="mt-2 flex max-w-full justify-start overflow-x-auto lg:flex-wrap lg:overflow-visible"
    onValueChange={(values) => {
      // Map the pressed value back onto the typed id space it came from.
      const picked = order.find((id) => id === values[0]);
      if (picked !== undefined) {
        onThemeChange(picked);
      }
    }}
    spacing={2}
    value={[theme]}
  >
    {order.map((id) => (
      <OptionToggleItem key={id} look="card" tone="invert" value={id}>
        <span className="font-heading text-base leading-none tracking-wide uppercase">
          {labels[id].label}
        </span>
        <span className="text-3xs tracking-caps-xs font-mono font-medium uppercase opacity-60">
          {labels[id].tagline}
        </span>
      </OptionToggleItem>
    ))}
  </ScrollToggleGroup>
);
