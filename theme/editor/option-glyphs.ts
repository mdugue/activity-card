// Duotone glyph per `ParamOption.glyph` id. The map lives in the editor — not
// on the `ParamOption` — so param specs in `lib/` stay JSX-free; the generic
// `ParamControl` renders the looked-up icon.

import {
  CircleDashedIcon,
  ClockIcon,
  GaugeIcon,
  LightningIcon,
  MountainsIcon,
  PathIcon,
  TextAaIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export const OPTION_GLYPHS = {
  avgSpeed: GaugeIcon,
  distance: PathIcon,
  duration: ClockIcon,
  elevation: MountainsIcon,
  maxSpeed: LightningIcon,
  name: TextAaIcon,
  none: CircleDashedIcon,
  pace: TimerIcon,
} satisfies Record<string, Icon>;

export type OptionGlyphId = keyof typeof OPTION_GLYPHS;

/** Whether a spec's `glyph` id has an icon in the map. */
export const isOptionGlyph = (glyph: string): glyph is OptionGlyphId =>
  Object.hasOwn(OPTION_GLYPHS, glyph);
