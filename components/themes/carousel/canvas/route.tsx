// Route canvas — the spanning signature for the Trace themes. The silhouette is
// projected aspect-preserving into the full strip and centred (RouteLine owns
// the projection), so it bleeds across slide edges at its true proportions —
// never stretched per-axis. A multi-activity project overlays every leg.

import type { CanvasProps } from "@/components/themes/carousel/define-theme";
import { heroInk } from "@/lib/carousel/resolve";
import { isMultiActivity, segmentRoutes } from "@/lib/multi-activity";
import { RouteLine } from "../route-line";

export function RouteCanvas({ data, style, w, h, overPhoto }: CanvasProps) {
  const multi = isMultiActivity(data);
  const heroRoutes = multi
    ? segmentRoutes(data).map((r) => r.coords)
    : undefined;
  const ink = heroInk(style, overPhoto);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "20%",
        height: "60%",
      }}
    >
      <RouteLine
        accent={style.accent}
        accent2={style.accent2}
        coords={data.routeCoordinates}
        h={h * 0.6}
        ink={ink}
        overPhoto={overPhoto}
        pad={60}
        routes={heroRoutes}
        showMarkers
        strokeWidth={8}
        style={style.routeStyle}
        w={w}
      />
    </div>
  );
}
