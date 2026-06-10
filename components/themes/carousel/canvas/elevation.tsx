// Elevation canvas — the spanning signature for the Ascent themes. The
// elevation profile is drawn as a mountain-range portrait filling the bottom of
// the strip; a multi-activity project lays each leg's profile side by side on a
// shared, distance-weighted scale. Returns null when there's no elevation to
// draw (the theme then reads as photo/route only).

import type { CanvasProps } from "@/components/themes/carousel/define-theme";
import { pickProfile } from "@/lib/carousel/profile";
import { isMultiActivity, segmentProfiles } from "@/lib/multi-activity";
import { ElevationBand } from "../elevation-band";

export function ElevationCanvas({ data, style, w, h, overPhoto }: CanvasProps) {
  const multi = isMultiActivity(data);
  const segProf = multi ? segmentProfiles(data) : null;
  const { profile, mode } = pickProfile(data);
  const ink = overPhoto && style.dark ? "#ffffff" : style.ink;

  const hasElevation = multi
    ? Boolean(segProf?.useElevation) && (segProf?.profiles.length ?? 0) > 0
    : mode === "elevation" && (profile?.length ?? 0) > 1;
  if (!hasElevation) {
    return null;
  }
  const heroBandMode = segProf?.useElevation ? "elevation" : "pace";

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "62%",
      }}
    >
      <ElevationBand
        colors={style.elevation}
        h={h * 0.62}
        markerColor={ink}
        markerFont={style.fonts.mono}
        markers
        mode={multi ? heroBandMode : mode}
        profile={profile}
        profiles={multi ? segProf?.profiles : undefined}
        w={w}
        weights={multi ? segProf?.distances : undefined}
      />
    </div>
  );
}
