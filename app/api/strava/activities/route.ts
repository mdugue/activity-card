import { NextResponse } from "next/server";
import { stravaErrorResponse, stravaFetch } from "@/lib/strava-client";
import type { StravaSummary } from "@/lib/strava-types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const perPage = url.searchParams.get("per_page") || "30";
  const page = url.searchParams.get("page") || "1";

  try {
    const list = await stravaFetch<StravaSummary[]>(
      `/athlete/activities?per_page=${perPage}&page=${page}`
    );
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
  } catch (err) {
    return stravaErrorResponse(err);
  }
}
