// Faint full-bleed photo underlay for the dense, light themes (Data, Triathlon).
// It sits at z-index -1 — above the theme's solid background, below all of its
// content — so it drops into a `position: relative` root without rewrapping the
// layout. A strong paper scrim keeps busy data legible; the photo reads as a
// subtle wash. background-image + inline `filter` (never backdrop-filter) so
// html-to-image captures it faithfully.

interface PhotoUnderlayProps {
  photoUrl: string;
}

export function PhotoUnderlay({ photoUrl }: PhotoUnderlayProps) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(0.92)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.74) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.78) 80%, rgba(255,255,255,0.92) 100%)",
        }}
      />
    </div>
  );
}
