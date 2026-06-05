import type { MetadataRoute } from "next";

// Web App Manifest — lets Effort be installed to the home screen / desktop and
// launched in a standalone window. iOS reads the apple-touch-icon + apple meta
// tags (wired up in `app/layout.tsx` and `app/apple-icon.png`) rather than this
// file, but Android/Chromium and desktop installs use it directly.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Effort — Activity Card",
    short_name: "Effort",
    description:
      "Turn a single endurance workout into a beautiful, shareable image.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Warm near-white page background so the splash screen matches the app and
    // there's no flash on launch.
    background_color: "#faf8f5",
    theme_color: "#faf8f5",
    categories: ["sports", "health", "lifestyle", "photo"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Maskable icon keeps the mark inside the safe zone so Android can crop it
      // to any shape (circle, squircle, rounded square) without clipping.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
