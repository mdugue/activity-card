import { cn } from "@/lib/utils";

/**
 * The Effort logo mark — an ascending line breaking into the accent square.
 * Mirrors `public`'s canonical `effort-mark` SVGs: ink ground, paper stroke,
 * rust square. Colours come from theme tokens so the same mark reads correctly
 * on paper (header) or ink (the claim panels' sign-off slide).
 */
export function EffortMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("block", className)}
      shapeRendering="geometricPrecision"
      viewBox="0 0 100 100"
    >
      <title>Effort</title>
      <rect className="fill-foreground" height="100" width="100" x="0" y="0" />
      <path
        className="stroke-background"
        d="M14 82 L36 62 L52 70 L80 28"
        fill="none"
        strokeLinejoin="miter"
        strokeWidth="11"
      />
      <rect className="fill-primary" height="16" width="16" x="72" y="20" />
    </svg>
  );
}

export function EffortWordmark({
  size = "default",
}: {
  size?: "default" | "sm";
}) {
  const isSm = size === "sm";
  return (
    <div className="flex items-center gap-3">
      <EffortMark className={isSm ? "size-5" : "size-8"} />
      <span
        className={cn(
          "font-heading uppercase leading-none tracking-wide",
          isSm ? "text-2xl" : "text-3xl"
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        EFFORT
      </span>
    </div>
  );
}
