import { type Coord, routePath } from "@/lib/chart-helpers";
import { FONT, INK, PAPER, RUST_BRIGHT } from "../design/tokens";

const STRAVA_ORANGE = "#fc5200";

/**
 * A document icon with a folded corner and a format badge — the "any file
 * works" beat. Drawn (not a chip) so a GPX and a .fit sheet read as real
 * files sitting in the 3D room.
 */
export function FileIcon({
  accent = RUST_BRIGHT,
  ext,
  width = 220,
}: {
  accent?: string;
  ext: string;
  width?: number;
}) {
  const height = width * 1.3;
  return (
    <svg
      height={height}
      style={{
        filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.55))",
        display: "block",
      }}
      viewBox="0 0 100 130"
      width={width}
    >
      <title>{ext} file</title>
      <path
        d="M12 6 H66 L88 28 V124 H12 Z"
        fill={PAPER}
        stroke="rgba(0,0,0,0.08)"
      />
      {/* folded corner */}
      <path d="M66 6 V28 H88 Z" fill="rgba(0,0,0,0.16)" />
      {/* a couple of faint content lines */}
      <rect
        fill="rgba(31,26,22,0.14)"
        height="3"
        rx="1.5"
        width="46"
        x="24"
        y="52"
      />
      <rect
        fill="rgba(31,26,22,0.10)"
        height="3"
        rx="1.5"
        width="34"
        x="24"
        y="62"
      />
      {/* the format badge */}
      <rect fill={accent} height="22" rx="4" width="58" x="12" y="90" />
      <text
        fill={INK}
        fontFamily={FONT.mono}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.5"
        textAnchor="middle"
        x="41"
        y="105"
      >
        {ext}
      </text>
    </svg>
  );
}

/**
 * A Strava activity chip — an orange tile carrying a stylised "S" and the
 * activity's route as a sparkline. Same footprint as `FileIcon` so the three
 * input sources weigh the same in the ingest beat and morph identically.
 *
 * Deliberately a generic stylised mark in the app's own typeface (not a
 * reproduction of Strava's logo / wordmark) — see docs/strava.md §2.
 */
export function StravaChip({
  coords,
  width = 220,
}: {
  coords: Coord[];
  width?: number;
}) {
  const height = width * 1.3;
  return (
    <svg
      height={height}
      style={{
        display: "block",
        filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.55))",
      }}
      viewBox="0 0 100 130"
      width={width}
    >
      <title>Strava activity</title>
      <rect fill={STRAVA_ORANGE} height={118} rx={10} width={88} x={6} y={6} />
      {/* the "S" roundel */}
      <circle cx={26} cy={30} fill={PAPER} r={14} />
      <text
        fill={STRAVA_ORANGE}
        fontFamily={FONT.heading}
        fontSize={22}
        fontWeight={700}
        textAnchor="middle"
        x={26}
        y={38}
      >
        S
      </text>
      <text
        fill={PAPER}
        fontFamily={FONT.heading}
        fontSize={15}
        letterSpacing={1}
        x={46}
        y={36}
      >
        STRAVA
      </text>
      {/* the route, as a sparkline */}
      <g transform="translate(12, 58)">
        <path
          d={routePath(coords, 76, 56, 4)}
          fill="none"
          stroke={PAPER}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.6}
        />
      </g>
    </svg>
  );
}
