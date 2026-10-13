import { describe, expect, test } from "bun:test";

import { scrubBreadcrumb, scrubEvent, stripQuery } from "./sentry-scrub";

describe("stripQuery", () => {
  test("drops query string and fragment", () => {
    expect(
      stripQuery("https://x.dev/api/strava/callback?code=abc&state=s")
    ).toBe("https://x.dev/api/strava/callback");
    expect(stripQuery("/editor#photo")).toBe("/editor");
    expect(stripQuery("/plain")).toBe("/plain");
  });
});

describe("scrubEvent", () => {
  test("keeps method + path, drops query, headers and cookies", () => {
    const scrubbed = scrubEvent({
      request: {
        cookies: { strava_token: "secret" },
        headers: { cookie: "strava_token=secret" },
        method: "GET",
        query_string: "code=abc",
        url: "https://x.dev/api/strava/callback?code=abc",
      },
      type: undefined,
    });
    expect(scrubbed.request).toEqual({
      method: "GET",
      url: "https://x.dev/api/strava/callback",
    });
  });

  test("leaves events without a request untouched", () => {
    const event = { message: "boom", type: undefined };
    expect(scrubEvent(event)).toBe(event);
  });
});

describe("scrubBreadcrumb", () => {
  test("strips query strings from url / from / to", () => {
    const scrubbed = scrubBreadcrumb({
      category: "navigation",
      data: {
        from: "/?a=1",
        status_code: 200,
        to: "/api/strava/callback?code=x",
      },
    });
    expect(scrubbed.data).toEqual({
      from: "/",
      status_code: 200,
      to: "/api/strava/callback",
    });
  });
});
