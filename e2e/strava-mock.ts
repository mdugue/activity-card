#!/usr/bin/env bun
// Minimal local declaration for the one Bun global we use — avoids pulling
// `@types/bun` into the dependency tree just for the test mock.
declare const Bun: {
  serve(opts: {
    port: number;
    fetch: (req: Request) => Response | Promise<Response>;
  }): { stop(): void };
};

/**
 * Mock Strava service for E2E tests.
 *
 * Replaces the three Strava endpoints the app talks to:
 *
 *   /oauth/authorize          → immediately redirects back to redirect_uri with a
 *                               fake code (simulates the user approving access)
 *   /oauth/token              → returns a fake token bundle + athlete
 *   /api/v3/athlete/activities → returns a fixed list of 3 activities
 *   /api/v3/activities/{id}    → returns detail JSON for the picked activity
 *   /api/v3/activities/{id}/streams → returns synthetic streams
 *
 * Hook it up from playwright.config.ts via the webServer array + env vars:
 *   STRAVA_OAUTH_URL=http://localhost:PORT/oauth/authorize
 *   STRAVA_TOKEN_URL=http://localhost:PORT/oauth/token
 *   STRAVA_API_BASE=http://localhost:PORT/api/v3
 */

const PORT = Number(process.env.STRAVA_MOCK_PORT || 3101);

const ATHLETE = {
  id: 99_001,
  firstname: "Alex",
  lastname: "Tester",
  profile_medium: "https://example.com/avatar.png",
};

interface ActivityFixture {
  distance: number; // meters
  id: number;
  moving_time: number; // seconds
  name: string;
  sport_type: string;
  start_date: string;
  total_elevation_gain?: number;
}

const ACTIVITIES: ActivityFixture[] = [
  {
    id: 1001,
    name: "Saturday in the Elbsandstein",
    sport_type: "Ride",
    start_date: "2026-05-18T08:30:00Z",
    distance: 42_300,
    moving_time: 5400,
    total_elevation_gain: 480,
  },
  {
    id: 1002,
    name: "Föhrer Westwind",
    sport_type: "Run",
    start_date: "2026-05-17T07:00:00Z",
    distance: 8400,
    moving_time: 2640,
    total_elevation_gain: 32,
  },
  {
    id: 1003,
    name: "Müggelsee laps",
    sport_type: "Swim",
    start_date: "2026-05-16T18:00:00Z",
    distance: 2000,
    moving_time: 2700,
  },
];

function makeStreams(count: number) {
  const latlng: [number, number][] = [];
  const altitude: number[] = [];
  const heartrate: number[] = [];
  const cadence: number[] = [];
  const time: number[] = [];
  const distance: number[] = [];
  const velocity: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    latlng.push([50 + t * 0.04, 8 + t * 0.05 + Math.sin(t * 6) * 0.005]);
    altitude.push(100 + Math.sin(t * 8) * 40 + t * 60);
    heartrate.push(Math.round(140 + Math.sin(t * 4) * 12));
    cadence.push(Math.round(80 + Math.sin(t * 9) * 6));
    time.push(Math.round(t * 5400));
    distance.push(Math.round(t * 42_300));
    velocity.push(8 + Math.sin(t * 5) * 1.5);
  }
  return {
    latlng: { type: "latlng", data: latlng, original_size: count },
    altitude: { type: "altitude", data: altitude, original_size: count },
    heartrate: { type: "heartrate", data: heartrate, original_size: count },
    cadence: { type: "cadence", data: cadence, original_size: count },
    time: { type: "time", data: time, original_size: count },
    distance: { type: "distance", data: distance, original_size: count },
    velocity_smooth: {
      type: "velocity_smooth",
      data: velocity,
      original_size: count,
    },
  };
}

const DETAIL_RE = /^\/api\/v3\/activities\/(\d+)$/;
const STREAMS_RE = /^\/api\/v3\/activities\/(\d+)\/streams$/;

function handle(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/health") {
    return Response.json({ ok: true });
  }

  if (url.pathname === "/oauth/authorize") {
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");
    if (!redirectUri) {
      return new Response("missing redirect_uri", { status: 400 });
    }
    const cb = new URL(redirectUri);
    cb.searchParams.set("code", "mock-auth-code");
    if (state) {
      cb.searchParams.set("state", state);
    }
    return Response.redirect(cb.toString(), 302);
  }

  if (url.pathname === "/oauth/token" && req.method === "POST") {
    return Response.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_type: "Bearer",
      expires_at: Math.floor(Date.now() / 1000) + 6 * 3600,
      expires_in: 6 * 3600,
      athlete: ATHLETE,
    });
  }

  if (url.pathname === "/api/v3/athlete/activities" && req.method === "GET") {
    return Response.json(ACTIVITIES);
  }

  const detailMatch = url.pathname.match(DETAIL_RE);
  if (detailMatch) {
    const id = Number(detailMatch[1]);
    const summary = ACTIVITIES.find((a) => a.id === id);
    if (!summary) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    const avgSpeedMps =
      summary.moving_time > 0 ? summary.distance / summary.moving_time : 0;
    return Response.json({
      ...summary,
      average_speed: avgSpeedMps,
      max_speed: avgSpeedMps * 1.6,
      average_heartrate: 152,
      average_cadence: 82,
      location_city: "Berlin",
      location_country: "Germany",
      athlete: { firstname: ATHLETE.firstname, lastname: ATHLETE.lastname },
    });
  }

  if (url.pathname.match(STREAMS_RE)) {
    return Response.json(makeStreams(60));
  }

  return new Response("not found", { status: 404 });
}

Bun.serve({ port: PORT, fetch: handle });
console.log(`Strava mock listening on http://localhost:${PORT}`);
