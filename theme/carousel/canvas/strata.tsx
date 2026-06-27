// Strata canvas — the spanning signature for the STRATA theme: the woven
// morph-field (route ridge top, elevation ridge bottom) plus a mood-tinted
// scrim, drawn across the whole strip. The mood / density / legend come from the
// theme's coerced config; the mood-swapped palette arrives via the deck style
// (STRATA's `resolveStyle`).

import { DEFAULT_STRATA_CONFIG, type StrataConfig } from "@/lib/strata";
import type { CanvasProps } from "@/theme/carousel/define-theme";
import { StrataHero } from "../strata-canvas";

export function StrataCanvas({
  data,
  style,
  w,
  h,
  overPhoto,
  config,
}: CanvasProps) {
  const cfg = (config ?? DEFAULT_STRATA_CONFIG) as StrataConfig;
  return (
    <StrataHero
      cfg={cfg}
      data={data}
      h={h}
      overPhoto={overPhoto}
      style={style}
      w={w}
    />
  );
}
