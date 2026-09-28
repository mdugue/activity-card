"use client";

import { Button } from "@/components/ui/button";

import { EffortWordmark } from "./effort-wordmark";

interface RouteErrorProps {
  /** Re-render the failed segment (Next's `error.js` `retry`). */
  retry: () => void;
}

/**
 * Fallback for an unexpected render error in a route segment. The most likely
 * cause on the editor page is a lazily loaded chunk that failed to download —
 * a flaky connection (retry fixes it) or a tab left open across a deploy whose
 * old chunk hashes are gone (only a full reload fixes it). Offer both.
 */
export function RouteError({ retry }: RouteErrorProps) {
  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <EffortWordmark />
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          Part of the app didn&apos;t load. Try again — if that doesn&apos;t
          help, reload the page (your uploaded file isn&apos;t sent anywhere, so
          you&apos;ll need to pick it again).
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload page
        </Button>
      </div>
    </main>
  );
}
