import { NextResponse } from "next/server";
import { stravaErrorResponse, stravaFetch } from "@/lib/strava-client";
import { clampedIntParam } from "@/lib/strava-params";
import type { StravaSummary } from "@/lib/strava-types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // 100 is Strava's documented per_page ceiling; clamping (rather than
  // rejecting) keeps the picker resilient to odd query strings.
  const perPage = clampedIntParam(url.searchParams.get("per_page"), 30, 1, 100);
  const page = clampedIntParam(url.searchParams.get("page"), 1, 1, 10_000);

  try {
    const qs = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
    });
    const list = await stravaFetch<StravaSummary[]>(
      `/athlete/activities?${qs}`
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
