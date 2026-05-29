interface StravaAttributionProps {
  /** Visual tint — defaults to Strava's brand orange. Light variant for use
   * on dark backgrounds where the orange would clash. */
  variant?: "brand" | "light" | "dark";
  width?: number;
}

const COLORS = {
  brand: "#FC4C02",
  light: "#ffffff",
  dark: "#11151a",
} as const;

/**
 * "Powered by Strava" mark. Required by Strava's brand guidelines on any
 * surface that displays data fetched from their API. The asset itself lives
 * in `public/strava/powered-by-strava.svg`; this component just renders it
 * inline so the colour can be themed and so html-to-image picks it up.
 */
export function StravaAttribution({
  variant = "brand",
  width = 140,
}: StravaAttributionProps) {
  const color = COLORS[variant];
  const height = Math.round((width / 200) * 56);
  return (
    <svg
      aria-label="Powered by Strava"
      height={height}
      role="img"
      viewBox="0 0 200 56"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Powered by Strava</title>
      <g fill={color} transform="translate(8 6)">
        <path d="M16 0 L24 16 L18.4 16 L16 11.2 L13.6 16 L8 16 Z" />
        <path d="M18 16 L22 16 L20 20 Z" />
        <path d="M20 20 L24 20 L22 24 Z" />
      </g>
      <g
        fill={color}
        fontFamily="Helvetica, Arial, sans-serif"
        transform="translate(44 0)"
      >
        <text
          fontSize="10"
          fontWeight={500}
          letterSpacing={1.2}
          opacity={0.85}
          x="0"
          y="20"
        >
          POWERED BY
        </text>
        <text fontSize="22" fontWeight={800} letterSpacing={1.6} x="0" y="42">
          STRAVA
        </text>
      </g>
    </svg>
  );
}
