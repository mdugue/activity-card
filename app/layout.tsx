import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const APP_NAME = "Effort";
const APP_TITLE = "Effort — Activity Card";
const APP_DESCRIPTION =
  "Turn a single endurance workout into a beautiful, shareable image.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  // `app/manifest.ts` already emits the <link rel="manifest">; this keeps the
  // PWA install metadata for iOS standalone mode in one place.
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  // Tints the browser/standalone UI to the app's warm near-white background.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1714" },
  ],
  // Declare support for both so the browser themes native UI (scrollbars, form
  // controls, the canvas) to the active scheme. Listed light-first so a browser
  // with no/unknown preference falls back to the light theme.
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn("h-full", "antialiased", fontVariables, "font-sans")}
      lang="en"
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
