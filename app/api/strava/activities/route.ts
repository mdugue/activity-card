import { NextResponse } from "next/server";

import { stravaErrorResponse, stravaFetch } from "@/lib/strava-client";
import { clampedIntParam } from "@/lib/strava-params";
import { StravaActivitySummaryListSchema } from "@/lib/strava-schemas";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  // 100 is Strava's documented per_page ceiling; clamping (rather than
  // rejecting) keeps the picker resilient to odd query strings.
  const perPage = clampedIntParam(url.searchParams.get("per_page"), 30, 1, 100);
  const page = clampedIntParam(url.searchParams.get("page"), 1, 1, 10_000);

  try {
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    const list = await stravaFetch(
      `/athlete/activities?${qs}`,
      StravaActivitySummaryListSchema
    );
    return NextResponse.json({
      activities: list.map((a) => ({
        distance: a.distance,
        id: a.id,
        moving_time: a.moving_time,
        name: a.name,
        sport_type: a.sport_type,
        start_date: a.start_date,
        summary_polyline: a.map?.summary_polyline ?? null,
        total_elevation_gain: a.total_elevation_gain,
      })),
    });
  } catch (error) {
    return stravaErrorResponse(error);
  }
};
