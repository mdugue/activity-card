// Data minimisation for error reports, a second line of defence behind the
// SDK's `dataCollection` switches (`sentry-options.ts`): these hooks strip
// anything that could identify a person or a Strava session — every query
// string (the OAuth callback carries `code` + `state`), request headers and
// cookies. Errors keep
// their message, stack, browser/OS and the page path — enough to debug, never
// enough to tell who hit them.

import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { z } from "zod";

/** `url` without its query string and fragment. */
export const stripQuery = (url: string): string => url.split(/[?#]/u)[0] ?? "";

// Breadcrumb keys that hold a URL (fetch/xhr `url`, navigation `from`/`to`).
const URL_KEYS = new Set(["from", "to", "url"]);
const urlValue = z.string();

/** `beforeSend`: drop the request's query, headers and cookies. */
export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  if (event.request === undefined) {
    return event;
  }
  const { url } = event.request;
  return {
    ...event,
    request: {
      method: event.request.method,
      url: url === undefined ? undefined : stripQuery(url),
    },
  };
};

/** `beforeBreadcrumb`: drop query strings from navigation / fetch URLs. */
export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
  if (breadcrumb.data === undefined) {
    return breadcrumb;
  }
  const data = Object.fromEntries(
    Object.entries(breadcrumb.data).map(([key, value]) => {
      const url = URL_KEYS.has(key) ? urlValue.safeParse(value) : undefined;
      return [key, url?.success === true ? stripQuery(url.data) : value];
    })
  );
  return { ...breadcrumb, data };
};
