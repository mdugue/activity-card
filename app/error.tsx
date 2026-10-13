"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { RouteError } from "@/components/app/route-error";

const ErrorPage = ({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return <RouteError retry={retry} />;
};

export default ErrorPage;
