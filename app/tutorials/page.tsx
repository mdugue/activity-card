import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { EffortWordmark } from "@/components/app/effort-wordmark";
import { TutorialsGallery } from "@/components/app/tutorials-gallery";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tutorials · Effort",
  description:
    "Short walkthroughs of everything Effort can do — from dropping a file to themes, photos, palettes, and sport-specific stats.",
};

export default function TutorialsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[68rem] items-center justify-between px-6 pt-7">
        <Link aria-label="Back to Effort" href="/">
          <EffortWordmark size="sm" />
        </Link>
        <Link
          className="inline-flex items-center gap-2 font-medium font-mono text-[11px] uppercase tracking-[0.16em] opacity-60 transition-opacity hover:opacity-100"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" weight="bold" />
          Back to the editor
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[68rem] px-6 pt-16 pb-24 lg:pt-24">
        <p className="caption-label">Tutorials</p>
        <h1 className="mt-4 max-w-3xl text-balance font-heading text-5xl uppercase leading-[0.92] lg:text-6xl">
          Everything Effort does, in five short clips
        </h1>
        <p className="mt-6 max-w-xl text-foreground/70 leading-relaxed">
          From dropping a GPX file to carousels, themes, photo palettes, and
          sport-specific stats — each walkthrough is under a minute, no sound
          needed.
        </p>

        <div className="mt-16 lg:mt-24">
          <TutorialsGallery />
        </div>

        <div className="mt-24 flex flex-col items-center gap-5 border-foreground/10 border-t pt-14 text-center">
          <h2 className="text-balance font-heading text-3xl uppercase leading-[0.95] lg:text-4xl">
            Ready to make yours?
          </h2>
          <Button
            className="h-auto justify-center px-7 py-3.5 font-heading text-xl uppercase tracking-wide shadow-lg shadow-primary/50"
            nativeButton={false}
            render={<Link href="/" />}
            size="lg"
          >
            Open the editor
          </Button>
        </div>
      </main>
    </div>
  );
}
