// Server-side error reporting (Next's `instrumentation`): Sentry for the
// Node and Edge runtimes, plus errors Next catches while rendering a request.
import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

export const register = () => {
  Sentry.init(sentryOptions);
};

export const onRequestError = Sentry.captureRequestError;
