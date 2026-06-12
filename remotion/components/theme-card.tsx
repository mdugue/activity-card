import { SINGLE_CARD_THEMES, type ThemeId } from "@/components/themes";
import type { ActivityData } from "@/lib/activity";
import type { ColorScheme } from "@/lib/colors";
import { pickThemeData } from "@/lib/theme-contract";

/**
 * Renders a real single-card theme at its native 1080×1350, exactly as the
 * app exports it — same registry, same data stripping. Wrap in `CardScaled`
 * to place it in a scene. The videos never mock a card.
 */
export function ThemeCard({
  colors,
  config,
  data,
  id,
  photoUrl,
}: {
  colors?: ColorScheme;
  config?: Record<string, unknown>;
  data: ActivityData;
  id: ThemeId;
  photoUrl?: string | null;
}) {
  const theme = SINGLE_CARD_THEMES[id];
  const { Component } = theme;
  return (
    <Component
      colors={colors}
      config={config ?? theme.defaults}
      data={pickThemeData(theme, data)}
      photoUrl={photoUrl}
    />
  );
}
