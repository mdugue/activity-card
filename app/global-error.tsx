"use client";

// Replaces the root layout when it throws, so it brings its own document and
// styles. Reports the error like `error.tsx` does.
import "./globals.css";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { RouteError } from "@/components/app/route-error";

const GlobalError = ({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <RouteError retry={retry} />
      </body>
    </html>
  );
};

export default GlobalError;
