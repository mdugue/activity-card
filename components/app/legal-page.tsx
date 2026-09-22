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
      <h1 className="font-heading mt-12 text-4xl leading-none uppercase lg:text-5xl">
        {title}
      </h1>
      <div className="text-foreground/75 mt-6 space-y-4 leading-relaxed">
        {children}
      </div>
      <p className="text-foreground/40 mt-auto pt-12 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
        Placeholder page · full content coming before launch
      </p>
    </main>
  );
}
