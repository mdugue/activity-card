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
    <div className="bg-background text-foreground min-h-dvh">
      <header className="mx-auto flex w-full max-w-[68rem] items-center justify-between px-6 pt-7">
        <Link aria-label="Back to Effort" href="/">
          <EffortWordmark size="sm" />
        </Link>
        <Link
          className="inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.16em] uppercase opacity-60 transition-opacity hover:opacity-100"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" weight="bold" />
          Back to the editor
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[68rem] px-6 pt-16 pb-24 lg:pt-24">
        <p className="caption-label">Tutorials</p>
        <h1 className="font-heading mt-4 max-w-3xl text-5xl leading-[0.92] text-balance uppercase lg:text-6xl">
          Everything Effort does, in five short clips
        </h1>
        <p className="text-foreground/70 mt-6 max-w-xl leading-relaxed">
          From dropping a GPX file to carousels, themes, photo palettes, and
          sport-specific stats — each walkthrough is under a minute, no sound
          needed.
        </p>

        <div className="mt-16 lg:mt-24">
          <TutorialsGallery />
        </div>

        <div className="border-foreground/10 mt-24 flex flex-col items-center gap-5 border-t pt-14 text-center">
          <h2 className="font-heading text-3xl leading-[0.95] text-balance uppercase lg:text-4xl">
            Ready to make yours?
          </h2>
          <Button
            className="font-heading shadow-primary/50 h-auto justify-center px-7 py-3.5 text-xl tracking-wide uppercase shadow-lg"
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
