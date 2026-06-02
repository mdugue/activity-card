import type { Metadata } from "next";
import {
  Anton,
  Archivo_Narrow,
  Bricolage_Grotesque,
  Cormorant_Garamond,
  DM_Sans,
  Geist_Mono,
  IBM_Plex_Mono,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Manrope,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { StravaFooter } from "@/components/app/strava-footer";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const anton = Anton({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-heading",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const playfair = Playfair_Display({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const archivoNarrow = Archivo_Narrow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-archivo-narrow",
});

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Effort — Activity Card",
  description:
    "Turn a single endurance workout into a beautiful, shareable image.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn(
        "h-full",
        "antialiased",
        jetbrainsMono.variable,
        anton.variable,
        inter.variable,
        cormorant.variable,
        manrope.variable,
        spaceGrotesk.variable,
        playfair.variable,
        dmSans.variable,
        archivoNarrow.variable,
        instrumentSerif.variable,
        bricolage.variable,
        ibmPlexMono.variable,
        geistMono.variable,
        "font-sans"
      )}
      lang="en"
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <StravaFooter />
        <Toaster />
      </body>
    </html>
  );
}
