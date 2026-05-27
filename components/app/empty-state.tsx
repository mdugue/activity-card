"use client";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onLoadSample: () => void;
}

export function EmptyState({ onLoadSample }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-24">
      <div
        className="font-mono text-xs tracking-[0.32em] opacity-55"
        style={{ fontWeight: 500 }}
      >
        STEP 01 / 03
      </div>

      <h1
        className="mt-7 text-center font-heading text-7xl uppercase leading-[0.88] tracking-tight sm:text-8xl md:text-[10rem] lg:text-[11rem]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        DROP YOUR
        <br />
        <span className="text-primary">EFFORT.</span>
      </h1>

      <p className="mt-6 max-w-xl text-center text-base leading-relaxed opacity-65 sm:text-lg">
        A{" "}
        <code className="bg-foreground px-2 py-1 font-mono text-background text-sm">
          .gpx
        </code>{" "}
        or{" "}
        <code className="bg-foreground px-2 py-1 font-mono text-background text-sm">
          .fit
        </code>{" "}
        file from any ride, run, swim, or triathlon. We&apos;ll make something
        worth keeping.
      </p>

      <DropZone onLoadSample={onLoadSample} />

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        {(["RIDE", "RUN", "SWIM", "TRIATHLON"] as const).map((s) => (
          <span
            className="border border-foreground px-3 py-1.5 font-mono text-xs tracking-[0.22em] opacity-80"
            key={s}
            style={{ fontWeight: 500 }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function DropZone({ onLoadSample }: { onLoadSample: () => void }) {
  return (
    <div className="relative mt-12 flex h-72 w-full max-w-2xl flex-col items-center justify-center border-2 border-foreground border-dashed bg-background/45">
      {/* corner brackets */}
      <div className="absolute -top-1 -left-1 size-5 bg-primary" />
      <div className="absolute -top-1 -right-1 size-5 bg-primary" />
      <div className="absolute -bottom-1 -left-1 size-5 bg-primary" />
      <div className="absolute -right-1 -bottom-1 size-5 bg-primary" />

      <svg
        aria-hidden
        aria-label="Line chart icon"
        className="mb-4"
        fill="none"
        height="64"
        role="img"
        viewBox="0 0 64 64"
        width="64"
      >
        <title>route mark</title>
        <path
          d="M14 44 Q24 18, 32 32 T54 22"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={3}
        />
        <circle
          className="text-primary"
          cx={14}
          cy={44}
          fill="currentColor"
          r={4}
        />
        <circle cx={54} cy={22} fill="currentColor" r={4} />
      </svg>

      <div
        className="text-center font-heading text-4xl uppercase leading-none tracking-tight sm:text-5xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        DROP A FILE HERE
      </div>
      <div
        className="mt-3 font-mono text-xs tracking-[0.16em] opacity-55"
        style={{ fontWeight: 500 }}
      >
        OR
      </div>
      <Button className="mt-3" onClick={onLoadSample} size="lg">
        Browse files
      </Button>
    </div>
  );
}
