import { NextResponse } from "next/server";
import {
  stravaErrorResponse,
  stravaFetch,
  stravaFetchOptional,
} from "@/lib/strava-client";
import { ensureFreshToken } from "@/lib/strava-cookies";
import { stravaToParsed } from "@/lib/strava-to-parsed";
import type { StravaActivityDetail, StravaStreams } from "@/lib/strava-types";

const STREAM_KEYS =
  "latlng,altitude,heartrate,cadence,velocity_smooth,time,distance";
const NUMERIC_ID = /^\d+$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!NUMERIC_ID.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    // Mint once and share — both calls run in parallel and must not each
    // trigger a token refresh.
    const token = await ensureFreshToken();
    const [detail, streams] = await Promise.all([
      stravaFetch<StravaActivityDetail>(`/activities/${id}`, { token }),
      // Streams are optional — if they fail (e.g. activity has no GPS) we
      // still return a parsed activity built from the session summary alone.
      stravaFetchOptional<StravaStreams>(
        `/activities/${id}/streams?keys=${STREAM_KEYS}&key_by_type=true`,
        { token }
      ),
    ]);

    const parts = stravaToParsed(detail, streams ?? {});
    return NextResponse.json({ parts });
  } catch (err) {
    return stravaErrorResponse(err);
  }
}
