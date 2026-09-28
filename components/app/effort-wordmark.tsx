import { cn } from "@/lib/utils";

/**
 * The Effort logo mark — an ascending line breaking into the accent square.
 * Colours come from theme tokens: an ink ground, paper stroke, rust peak. On
 * the paper header the ground reads as the mark's body; on an ink panel (the
 * claim panels' sign-off slide) the ground blends and the paper stroke + rust
 * peak carry it — the brand's dark-on-light / light-on-dark lockups.
 */
export const EffortMark = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={cn("block", className)}
    // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- `shapeRendering` is the SVG presentation attribute's fixed React name, not a symbol we choose
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

export const EffortWordmark = ({
  size = "default",
  labelClassName,
}: {
  labelClassName?: string;
  size?: "default" | "sm";
}) => {
  const isSm = size === "sm";
  return (
    <div className="flex items-center gap-3">
      <EffortMark className={isSm ? "size-5" : "size-8"} />
      <span
        className={cn(
          "font-heading leading-none tracking-wide uppercase",
          isSm ? "text-2xl" : "text-3xl",
          labelClassName
        )}
      >
        EFFORT
      </span>
    </div>
  );
};
