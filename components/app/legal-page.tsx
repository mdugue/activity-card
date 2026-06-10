import Link from "next/link";
import type { ReactNode } from "react";
import { EffortWordmark } from "@/components/app/effort-wordmark";

// Shared shell for the placeholder legal pages (imprint, privacy). Server
// component — keeps these routes static and dependency-free.
export function LegalPage({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-12 lg:py-16">
      <Link aria-label="Back to Effort" className="w-fit" href="/">
        <EffortWordmark size="sm" />
      </Link>
      <h1 className="mt-12 font-heading text-4xl uppercase leading-none lg:text-5xl">
        {title}
      </h1>
      <div className="mt-6 space-y-4 text-foreground/75 leading-relaxed">
        {children}
      </div>
      <p className="mt-auto pt-12 font-medium font-mono text-[11px] text-foreground/40 uppercase tracking-[0.16em]">
        Placeholder page · full content coming before launch
      </p>
    </main>
  );
}
