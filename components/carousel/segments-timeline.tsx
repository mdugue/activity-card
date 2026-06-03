// Relay's signature: a swim → T1 → bike → T2 → run timeline spanning the whole
// seamless strip, segment widths proportional to time, so each leg bleeds
// across slide edges. Kept slim and sits in the upper band so the per-panel
// title/stats below stay clear. Returns null (→ the route) without segments.

import type { ActivityData } from "@/components/app/sample-data";
import { formatClock, formatNumber } from "@/lib/format";

interface SegmentsTimelineProps {
  accent: string;
  accent2: string;
  data: ActivityData;
  ink: string;
  monoFont: string;
  mutedInk: string;
  numeralFont: string;
}

interface Leg {
  color: string;
  distanceKm?: number;
  durationSec: number;
  label: string;
  transition: boolean;
}

export function SegmentsTimeline({
  data,
  ink,
  mutedInk,
  accent,
  accent2,
  numeralFont,
  monoFont,
}: SegmentsTimelineProps) {
  const segments = data.segments ?? [];
  if (segments.length < 2) {
    return null;
  }
  const transitions = data.transitions ?? [];
  const legColor = (sport: string) => {
    if (sport === "swim") {
      return accent2;
    }
    if (sport === "run") {
      return accent;
    }
    return "#ffb43c";
  };

  const legs: Leg[] = [];
  segments.forEach((seg, i) => {
    legs.push({
      label: seg.sport.toUpperCase(),
      durationSec: seg.durationSec,
      distanceKm: seg.distanceKm,
      color: legColor(seg.sport),
      transition: false,
    });
    const t = transitions[i];
    if (t && i < segments.length - 1) {
      legs.push({
        label: t.name,
        durationSec: t.durationSec,
        color: mutedInk,
        transition: true,
      });
    }
  });

  const total = legs.reduce((s, l) => s + l.durationSec, 0) || 1;
  const pad = 70;

  return (
    <div
      style={{
        position: "absolute",
        left: pad,
        right: pad,
        top: "23%",
        display: "flex",
        alignItems: "flex-end",
        gap: 5,
      }}
    >
      {legs.map((leg) => {
        const pct = (leg.durationSec / total) * 100;
        return (
          <div
            key={`${leg.label}-${leg.durationSec}`}
            style={{ width: `${pct}%`, minWidth: 0 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: monoFont,
                  fontSize: 16,
                  letterSpacing: "0.14em",
                  color: leg.transition ? mutedInk : ink,
                }}
              >
                {leg.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: numeralFont,
                fontSize: leg.transition ? 22 : 34,
                lineHeight: 0.95,
                color: leg.transition ? mutedInk : ink,
                marginTop: 2,
              }}
            >
              {formatClock(leg.durationSec)}
            </div>
            <div
              aria-hidden
              style={{
                height: leg.transition ? 6 : 12,
                marginTop: 10,
                background: leg.color,
                opacity: leg.transition ? 0.5 : 1,
                borderRadius: 2,
              }}
            />
            {leg.distanceKm ? (
              <div
                style={{
                  marginTop: 8,
                  fontFamily: monoFont,
                  fontSize: 14,
                  color: mutedInk,
                }}
              >
                {formatNumber(leg.distanceKm, 1)} KM
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
