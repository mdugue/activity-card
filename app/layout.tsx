import type { Metadata, Viewport } from "next";

import "./globals.css";
import { IconDefaults } from "@/components/app/icon-defaults";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const APP_NAME = "Effort";
const APP_TITLE = "Effort — Activity Card";
const APP_DESCRIPTION =
  "Turn a single endurance workout into a beautiful, shareable image.";

// Every page is a prerendered static shell — the editor runs entirely in the
// browser; only the Strava Route Handlers are dynamic. Next fails the build
// (and flags it in dev) if a page ever starts rendering per request.
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  // `app/manifest.ts` already emits the <link rel="manifest">; this keeps the
  // PWA install metadata for iOS standalone mode in one place.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  applicationName: APP_NAME,
  description: APP_DESCRIPTION,
  formatDetection: {
    telephone: false,
  },
  title: APP_TITLE,
};

export const viewport: Viewport = {
  // Declare support for both so the browser themes native UI (scrollbars, form
  // controls, the canvas) to the active scheme. Listed light-first so a browser
  // with no/unknown preference falls back to the light theme.
  colorScheme: "light dark",
  // Tints the browser/standalone UI to the app's warm near-white background.
  themeColor: [
    { color: "#faf8f5", media: "(prefers-color-scheme: light)" },
    { color: "#1a1714", media: "(prefers-color-scheme: dark)" },
  ],
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html
    className={cn("h-full", "antialiased", fontVariables, "font-sans")}
    lang="en"
  >
    <body className="flex min-h-full flex-col">
      <IconDefaults>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </IconDefaults>
    </body>
  </html>
);

export default RootLayout;
