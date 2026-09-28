import { NextResponse } from "next/server";

import { stravaErrorResponse, stravaFetch } from "@/lib/strava-client";
import { ensureFreshToken, readTokens } from "@/lib/strava-cookies";
import { StravaAthleteStatsSchema } from "@/lib/strava-schemas";

const PER_PAGE = 30;

/**
 * Returns the user's lifetime activity count and the implied page count
 * for the picker's per-page setting. Note: Strava only exposes counts for
 * ride/run/swim — hikes, workouts, virtual rides etc. aren't included.
 * The picker treats this as a hint and still trusts canGoNext (current
 * page === full) for the actual edge of the list.
 */
export const GET = async () => {
  try {
    const token = await ensureFreshToken();
    const tokens = await readTokens();
    const athleteId = tokens?.athlete?.id;
    if (athleteId === undefined || athleteId === 0) {
      return NextResponse.json({ error: "no_athlete" }, { status: 400 });
    }

    const stats = await stravaFetch(
      `/athletes/${athleteId}/stats`,
      StravaAthleteStatsSchema,
      { token }
    );
    const totalCount =
      (stats.all_ride_totals?.count ?? 0) +
      (stats.all_run_totals?.count ?? 0) +
      (stats.all_swim_totals?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
    return NextResponse.json({ totalCount, totalPages });
  } catch (error) {
    return stravaErrorResponse(error);
  }
};
