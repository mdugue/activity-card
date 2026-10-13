// Shared Sentry options for every runtime (browser, Node, Edge). Errors only:
// no performance tracing, no session replay, no PII (`dataCollection` below,
// with `sentry-scrub.ts` as a second line of defence).
// Without `NEXT_PUBLIC_SENTRY_DSN` (local dev, e2e, forks) Sentry stays off.

import type { BrowserOptions } from "@sentry/nextjs";

import { scrubBreadcrumb, scrubEvent } from "./sentry-scrub";
import { nonEmpty } from "./text";

const dsn = nonEmpty(process.env.NEXT_PUBLIC_SENTRY_DSN);

export const sentryOptions = {
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: scrubEvent,
  // Collect nothing that identifies a person: no user/IP inference, no
  // cookies, headers, query params, bodies or local variable values.
  dataCollection: {
    cookies: false,
    httpBodies: [],
    httpHeaders: false,
    stackFrameVariables: false,
    urlQueryParams: false,
    userInfo: false,
  },
  dsn,
  enabled: dsn !== undefined,
  environment: nonEmpty(process.env.NEXT_PUBLIC_VERCEL_ENV) ?? "development",
  tracesSampleRate: 0,
} satisfies BrowserOptions;
