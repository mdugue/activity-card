import { NextResponse } from "next/server";
import {
  ensureFreshToken,
  STRAVA_API_BASE,
  StravaNotConnectedError,
} from "@/lib/strava-cookies";

interface StravaSummary {
  distance: number;
  elapsed_time?: number;
  id: number;
  map?: { summary_polyline?: string };
  moving_time: number;
  name: string;
  sport_type: string;
  start_date: string;
  total_elevation_gain?: number;
}

export async function GET(request: Request) {
  let token: string;
  try {
    token = await ensureFreshToken();
  } catch (err) {
    if (err instanceof StravaNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw err;
  }

  const url = new URL(request.url);
  const perPage = url.searchParams.get("per_page") || "30";
  const page = url.searchParams.get("page") || "1";

  const upstream = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}&page=${page}`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "strava_error", status: upstream.status },
      { status: 502 }
    );
  }
  const list = (await upstream.json()) as StravaSummary[];
  return NextResponse.json({
    activities: list.map((a) => ({
      id: a.id,
      name: a.name,
      sport_type: a.sport_type,
      start_date: a.start_date,
      distance: a.distance,
      moving_time: a.moving_time,
      total_elevation_gain: a.total_elevation_gain,
      summary_polyline: a.map?.summary_polyline ?? null,
    })),
  });
}
