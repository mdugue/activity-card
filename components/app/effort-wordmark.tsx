export function EffortWordmark({
  size = "default",
}: {
  size?: "default" | "sm";
}) {
  const isSm = size === "sm";
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          isSm
            ? "flex size-5 items-center justify-center bg-foreground"
            : "flex size-8 items-center justify-center bg-foreground"
        }
      >
        <div
          aria-hidden
          className={isSm ? "size-2 bg-primary" : "size-3.5 bg-primary"}
        />
      </div>
      <span
        className={
          isSm
            ? "font-heading text-2xl uppercase leading-none tracking-wide"
            : "font-heading text-3xl uppercase leading-none tracking-wide"
        }
        style={{ fontFamily: "var(--font-heading)" }}
      >
        EFFORT
      </span>
    </div>
  );
}
