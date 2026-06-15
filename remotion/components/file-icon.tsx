import {
  FONT,
  INK,
  PAPER,
  RADIUS,
  RUST_BRIGHT,
  TRACKING,
} from "../design/tokens";

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

/** A compact "Strava activity" plate — pairs with the official connect button
 *  elsewhere. Uses the brand orange, the wordmark stays on the official asset. */
export function SourcePlate({
  accent = RUST_BRIGHT,
  label,
  width = 300,
}: {
  accent?: string;
  label: string;
  width?: number;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: "rgba(247,243,236,0.06)",
        border: "1px solid rgba(247,243,236,0.16)",
        borderRadius: RADIUS.md,
        boxShadow: "0 40px 70px -30px rgba(0,0,0,0.6)",
        color: PAPER,
        display: "flex",
        fontFamily: FONT.mono,
        fontSize: 22,
        fontWeight: 600,
        gap: 18,
        letterSpacing: TRACKING.micro,
        padding: "26px 34px",
        textTransform: "uppercase",
        width,
      }}
    >
      <span
        style={{
          backgroundColor: accent,
          borderRadius: 6,
          flex: "none",
          height: 26,
          width: 26,
        }}
      />
      {label}
    </div>
  );
}
