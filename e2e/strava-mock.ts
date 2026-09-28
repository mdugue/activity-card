#!/usr/bin/env bun
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

/** An env var / query param, where unset or empty both mean "use the fallback". */
const nonEmptyOr = (value: string | null | undefined, fallback: string) =>
  value === null || value === undefined || value === "" ? fallback : value;

const PORT = Number(nonEmptyOr(process.env.STRAVA_MOCK_PORT, "3101"));

const ATHLETE = {
  firstname: "Alex",
  id: 99_001,
  lastname: "Tester",
  profile_medium: "https://example.com/avatar.png",
};

interface ActivityFixture {
  /** meters */
  distance: number;
  id: number;
  /** seconds */
  moving_time: number;
  name: string;
  sport_type: string;
  start_date: string;
  total_elevation_gain?: number;
}

const NAMED_ACTIVITIES: ActivityFixture[] = [
  {
    distance: 42_300,
    id: 1001,
    moving_time: 5400,
    name: "Saturday in the Elbsandstein",
    sport_type: "Ride",
    start_date: "2026-05-18T08:30:00Z",
    total_elevation_gain: 480,
  },
  {
    distance: 8400,
    id: 1002,
    moving_time: 2640,
    name: "Föhrer Westwind",
    sport_type: "Run",
    start_date: "2026-05-17T07:00:00Z",
    total_elevation_gain: 32,
  },
  {
    distance: 2000,
    id: 1003,
    moving_time: 2700,
    name: "Müggelsee laps",
    sport_type: "Swim",
    start_date: "2026-05-16T18:00:00Z",
  },
];

const SYNTH_COUNT = 50;
const SYNTH_SPORTS = ["Ride", "Run", "Swim"] as const;

// Synthesised filler activities so pagination tests have real content past
// the first page. Deterministic by id so other tests can target them too.
const SYNTH_ACTIVITIES: ActivityFixture[] = Array.from(
  { length: SYNTH_COUNT },
  (_, i) => {
    const sport = SYNTH_SPORTS[i % SYNTH_SPORTS.length];
    const id = 2000 + i;
    // pushed back past the three named activities
    const dayOffset = i + 4;
    const start = new Date(Date.UTC(2026, 4, 16 - dayOffset, 7, 0, 0));
    return {
      distance: 5000 + i * 500,
      id,
      moving_time: 1800 + i * 60,
      name: `Mock ${sport} #${i + 1}`,
      sport_type: sport,
      start_date: start.toISOString(),
      total_elevation_gain: sport === "Ride" ? 200 + i * 5 : 20 + i,
    };
  }
);

const ACTIVITIES: ActivityFixture[] = [
  ...NAMED_ACTIVITIES,
  ...SYNTH_ACTIVITIES,
];

const makeStreams = (count: number) => {
  const latlng: [number, number][] = [];
  const altitude: number[] = [];
  const heartrate: number[] = [];
  const cadence: number[] = [];
  const time: number[] = [];
  const distance: number[] = [];
  const velocity: number[] = [];
  for (let i = 0; i < count; i += 1) {
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
    altitude: { data: altitude, original_size: count, type: "altitude" },
    cadence: { data: cadence, original_size: count, type: "cadence" },
    distance: { data: distance, original_size: count, type: "distance" },
    heartrate: { data: heartrate, original_size: count, type: "heartrate" },
    latlng: { data: latlng, original_size: count, type: "latlng" },
    time: { data: time, original_size: count, type: "time" },
    velocity_smooth: {
      data: velocity,
      original_size: count,
      type: "velocity_smooth",
    },
  };
};

const DETAIL_RE = /^\/api\/v3\/activities\/\d+$/u;
const STREAMS_RE = /^\/api\/v3\/activities\/\d+\/streams$/u;
const STATS_RE = /^\/api\/v3\/athletes\/\d+\/stats$/u;
const PHOTOS_RE = /^\/api\/v3\/activities\/\d+\/photos$/u;
const PHOTO_FILE_RE = /^\/photos\/\d+-\d+\.png$/u;

/** The activity id in a matched `/api/v3/activities/{id}…` path. */
const activityIdOf = (url: URL): number => Number(url.pathname.split("/")[4]);

// How many photos each fixture activity carries (others have none). The ride
// gets two so the strip and "pick the second one" flows are coverable.
const PHOTO_COUNTS = new Map<number, number>([
  [1001, 2],
  [1002, 1],
]);

// A 1×1 orange PNG — enough for <img> rendering and the proxy round-trip.
const PHOTO_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  ),
  // atob yields Latin-1 characters, so every code point is a byte.
  (c) => c.codePointAt(0) ?? 0
);

/** The photo list endpoint + the static images its URLs point at. */
const handlePhotoRoutes = (url: URL): Response | null => {
  if (PHOTOS_RE.test(url.pathname)) {
    const id = activityIdOf(url);
    const size = nonEmptyOr(url.searchParams.get("size"), "600");
    const count = PHOTO_COUNTS.get(id) ?? 0;
    return Response.json(
      Array.from({ length: count }, (_, i) => ({
        source: 1,
        unique_id: `photo-${id}-${i}`,
        urls: { [size]: `http://localhost:${PORT}/photos/${id}-${i}.png` },
      }))
    );
  }
  if (PHOTO_FILE_RE.test(url.pathname)) {
    return new Response(PHOTO_PNG, {
      headers: { "content-type": "image/png" },
    });
  }
  return null;
};

const handle = (req: Request): Response | Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === "/health") {
    return Response.json({ ok: true });
  }

  if (url.pathname === "/oauth/authorize") {
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");
    if (redirectUri === null || redirectUri === "") {
      return new Response("missing redirect_uri", { status: 400 });
    }
    const cb = new URL(redirectUri);
    cb.searchParams.set("code", "mock-auth-code");
    if (state !== null && state !== "") {
      cb.searchParams.set("state", state);
    }
    return Response.redirect(cb.toString(), 302);
  }

  if (url.pathname === "/oauth/token" && req.method === "POST") {
    return Response.json({
      access_token: "mock-access-token",
      athlete: ATHLETE,
      expires_at: Math.floor(Date.now() / 1000) + 6 * 3600,
      expires_in: 6 * 3600,
      refresh_token: "mock-refresh-token",
      token_type: "Bearer",
    });
  }

  if (url.pathname === "/api/v3/athlete/activities" && req.method === "GET") {
    const page = Math.max(
      1,
      Number(nonEmptyOr(url.searchParams.get("page"), "1"))
    );
    const perPage = Math.max(
      1,
      Number(nonEmptyOr(url.searchParams.get("per_page"), "30"))
    );
    const start = (page - 1) * perPage;
    return Response.json(ACTIVITIES.slice(start, start + perPage));
  }

  if (DETAIL_RE.test(url.pathname)) {
    const id = activityIdOf(url);
    const summary = ACTIVITIES.find((a) => a.id === id);
    if (!summary) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    const avgSpeedMps =
      summary.moving_time > 0 ? summary.distance / summary.moving_time : 0;
    return Response.json({
      ...summary,
      athlete: { firstname: ATHLETE.firstname, lastname: ATHLETE.lastname },
      average_cadence: 82,
      average_heartrate: 152,
      average_speed: avgSpeedMps,
      location_city: "Berlin",
      location_country: "Germany",
      max_speed: avgSpeedMps * 1.6,
    });
  }

  if (STREAMS_RE.test(url.pathname)) {
    return Response.json(makeStreams(60));
  }

  const photoResponse = handlePhotoRoutes(url);
  if (photoResponse) {
    return photoResponse;
  }

  if (STATS_RE.test(url.pathname)) {
    // Split the 53 fixture activities by sport so the picker's "Page X of Y"
    // matches the actual pageable content.
    const rideCount = ACTIVITIES.filter((a) =>
      a.sport_type.toLowerCase().includes("ride")
    ).length;
    const runCount = ACTIVITIES.filter((a) =>
      a.sport_type.toLowerCase().includes("run")
    ).length;
    const swimCount = ACTIVITIES.filter((a) =>
      a.sport_type.toLowerCase().includes("swim")
    ).length;
    return Response.json({
      all_ride_totals: { count: rideCount },
      all_run_totals: { count: runCount },
      all_swim_totals: { count: swimCount },
    });
  }

  return new Response("not found", { status: 404 });
};

Bun.serve({ fetch: handle, port: PORT });
console.log(`Strava mock listening on http://localhost:${PORT}`);
