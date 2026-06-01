import { NextResponse } from "next/server";
import {
  ensureFreshToken,
  readTokens,
  STRAVA_API_BASE,
  StravaNotConnectedError,
} from "@/lib/strava-cookies";

interface ActivityTotal {
  count: number;
}

interface StravaStats {
  all_ride_totals?: ActivityTotal;
  all_run_totals?: ActivityTotal;
  all_swim_totals?: ActivityTotal;
}

const PER_PAGE = 30;

/**
 * Returns the user's lifetime activity count and the implied page count
 * for the picker's per-page setting. Note: Strava only exposes counts for
 * ride/run/swim — hikes, workouts, virtual rides etc. aren't included.
 * The picker treats this as a hint and still trusts canGoNext (current
 * page === full) for the actual edge of the list.
 */
export async function GET() {
  let token: string;
  try {
    token = await ensureFreshToken();
  } catch (err) {
    if (err instanceof StravaNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw err;
  }

  const tokens = await readTokens();
  const athleteId = tokens?.athlete?.id;
  if (!athleteId) {
    return NextResponse.json({ error: "no_athlete" }, { status: 400 });
  }

  const upstream = await fetch(
    `${STRAVA_API_BASE}/athletes/${athleteId}/stats`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "strava_error", status: upstream.status },
      { status: 502 }
    );
  }
  const stats = (await upstream.json()) as StravaStats;
  const totalCount =
    (stats.all_ride_totals?.count ?? 0) +
    (stats.all_run_totals?.count ?? 0) +
    (stats.all_swim_totals?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  return NextResponse.json({ totalCount, totalPages });
}
