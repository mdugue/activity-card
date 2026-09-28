import type { MetadataRoute } from "next";

// Web App Manifest — lets Effort be installed to the home screen / desktop and
// launched in a standalone window. iOS reads the apple-touch-icon + apple meta
// tags (wired up in `app/layout.tsx` and `app/apple-icon.png`) rather than this
// file, but Android/Chromium and desktop installs use it directly.
const manifest = (): MetadataRoute.Manifest => ({
  // Warm near-white page background so the splash screen matches the app and
  // there's no flash on launch.
  background_color: "#faf8f5",
  categories: ["sports", "health", "lifestyle", "photo"],
  description:
    "Turn a single endurance workout into a beautiful, shareable image.",
  display: "standalone",
  icons: [
    {
      purpose: "any",
      sizes: "192x192",
      src: "/icons/icon-192.png",
      type: "image/png",
    },
    {
      purpose: "any",
      sizes: "512x512",
      src: "/icons/icon-512.png",
      type: "image/png",
    },
    // Maskable icon keeps the mark inside the safe zone so Android can crop it
    // to any shape (circle, squircle, rounded square) without clipping.
    {
      purpose: "maskable",
      sizes: "512x512",
      src: "/icons/icon-maskable-512.png",
      type: "image/png",
    },
  ],
  name: "Effort — Activity Card",
  orientation: "portrait",
  scope: "/",
  short_name: "Effort",
  start_url: "/",
  theme_color: "#faf8f5",
});

export default manifest;
