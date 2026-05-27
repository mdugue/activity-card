import type { ActivityData } from "./sample-data";

type Theme = "path" | "altitude" | "photo" | "data" | "editorial" | "triathlon";

type CardPreviewProps = {
  data: ActivityData;
  theme: Theme;
  photoUrl?: string | null;
};

function sportLabel(sport: ActivityData["sport"]) {
  return sport.toUpperCase();
}

function paceOrSpeed(data: ActivityData) {
  if (data.avg_pace_min_per_km) {
    return { label: "PACE", value: data.avg_pace_min_per_km, unit: "/km" };
  }
  if (data.avg_pace_per_100m) {
    return { label: "PACE", value: data.avg_pace_per_100m, unit: "/100m" };
  }
  if (data.avg_speed_kmh) {
    return {
      label: "SPEED",
      value: data.avg_speed_kmh.toFixed(1),
      unit: "km/h",
    };
  }
  return { label: "AVG", value: "—", unit: "" };
}

/**
 * Placeholder card preview at intrinsic 1080×1350.
 * The six fully-styled themes are tracked separately (SPEC build phase).
 * Caller scales via CSS transform.
 */
export function CardPreview({ data, theme, photoUrl }: CardPreviewProps) {
  const ps = paceOrSpeed(data);
  const themeAccent =
    {
      path: "#c45a2c",
      altitude: "#1d3a2e",
      photo: "#11151a",
      data: "#1e6fa0",
      editorial: "#a98352",
      triathlon: "#d23f1d",
    }[theme] ?? "#c45a2c";

  return (
    <div
      className="relative flex h-[1350px] w-[1080px] flex-col overflow-hidden bg-[#f3ede2] text-[#1a1714]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {photoUrl ? (
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{ background: `url(${photoUrl}) center/cover` }}
        />
      ) : null}

      {/* corner brackets */}
      <div
        className="absolute top-12 left-12 h-10 w-10"
        style={{ background: themeAccent }}
      />
      <div
        className="absolute right-12 bottom-12 h-10 w-10"
        style={{ background: themeAccent }}
      />

      <div className="relative flex flex-1 flex-col px-24 py-24">
        <div
          className="font-mono text-3xl tracking-[0.28em] opacity-60"
          style={{ fontWeight: 500 }}
        >
          {sportLabel(data.sport)} · {data.date.toUpperCase()}
        </div>

        <h1
          className="mt-10 font-heading text-[120px] uppercase leading-[0.88] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {data.ride_name}
        </h1>

        <div className="mt-8 font-mono text-3xl tracking-[0.18em] opacity-70">
          {data.location.toUpperCase()}
        </div>

        {/* abstract route silhouette */}
        <svg
          aria-hidden
          className="my-12 h-[300px] w-full"
          fill="none"
          viewBox="0 0 1000 420"
        >
          <path
            d="M40 320 Q160 80 320 240 T620 180 Q780 100 940 280"
            stroke={themeAccent}
            strokeLinecap="round"
            strokeWidth={14}
          />
          <circle cx={40} cy={320} fill={themeAccent} r={18} />
          <circle cx={940} cy={280} fill="#1a1714" r={18} />
        </svg>

        <div className="mt-auto grid grid-cols-3 gap-12 border-[#1a1714] border-t pt-10">
          <Stat
            label="DISTANCE"
            unit="KM"
            value={data.distance_km.toFixed(1)}
          />
          <Stat label="TIME" unit="" value={data.duration} />
          <Stat
            label={ps.label}
            unit={ps.unit.toUpperCase()}
            value={ps.value}
          />
        </div>

        {data.elevation_gain_m === undefined ? null : (
          <div className="mt-10 grid grid-cols-2 gap-12">
            <Stat
              label="ELEVATION"
              unit="M"
              value={data.elevation_gain_m.toString()}
            />
            {data.avg_heart_rate ? (
              <Stat
                label="AVG HR"
                unit="BPM"
                value={data.avg_heart_rate.toString()}
              />
            ) : null}
          </div>
        )}

        <div className="mt-12 flex items-end justify-between">
          <div
            className="font-mono text-2xl tracking-[0.22em] opacity-60"
            style={{ fontWeight: 500 }}
          >
            EFFORT · {data.athlete_name.toUpperCase()}
          </div>
          <div
            className="font-mono text-xl tracking-[0.22em] opacity-50"
            style={{ fontWeight: 500 }}
          >
            {theme.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div>
      <div
        className="font-mono text-xl tracking-[0.24em] opacity-60"
        style={{ fontWeight: 500 }}
      >
        {label}
      </div>
      <div
        className="mt-3 font-heading text-7xl uppercase leading-none tracking-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </div>
      {unit ? (
        <div
          className="mt-2 font-mono text-xl tracking-[0.18em] opacity-70"
          style={{ fontWeight: 500 }}
        >
          {unit}
        </div>
      ) : null}
    </div>
  );
}
