// Elevation canvas — the spanning signature for the Ascent themes. The
// elevation profile is drawn as a mountain-range portrait filling the bottom of
// the strip; a multi-activity project lays each leg's profile side by side on a
// shared, distance-weighted scale. Returns null when there's no elevation to
// draw (the theme then reads as photo/route only).

import { isMultiActivity, segmentProfiles } from "@/lib/multi-activity";
import type { CanvasProps } from "@/theme/carousel/define-theme";
import { pickProfile } from "@/theme/carousel/profile";
import { heroInk } from "@/theme/carousel/resolve";

import { ElevationBand } from "../elevation-band";

export const ElevationCanvas = ({
  data,
  style,
  w,
  h,
  overPhoto,
}: CanvasProps) => {
  const multi = isMultiActivity(data);
  const segProf = multi ? segmentProfiles(data) : null;
  const { profile, mode } = pickProfile(data);
  const ink = heroInk(style, overPhoto);

  const segElevation = segProf?.useElevation === true;
  const segCount = segProf?.profiles.length ?? 0;
  const profileLen = profile?.length ?? 0;
  const hasElevation = multi
    ? segElevation && segCount > 0
    : mode === "elevation" && profileLen > 1;
  if (!hasElevation) {
    return null;
  }
  const heroBandMode = segElevation ? "elevation" : "pace";

  return (
    <div
      style={{
        bottom: 0,
        height: "62%",
        left: 0,
        position: "absolute",
        right: 0,
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
};
