import { NextResponse } from "next/server";
import {
  ensureFreshToken,
  STRAVA_API_BASE,
  StravaNotConnectedError,
} from "@/lib/strava-cookies";
import {
  type StravaActivityDetail,
  type StravaStreams,
  stravaToParsed,
} from "@/lib/strava-to-parsed";

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

  let token: string;
  try {
    token = await ensureFreshToken();
  } catch (err) {
    if (err instanceof StravaNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw err;
  }

  const headers = { authorization: `Bearer ${token}` };
  const [detailRes, streamsRes] = await Promise.all([
    fetch(`${STRAVA_API_BASE}/activities/${id}`, {
      headers,
      cache: "no-store",
    }),
    fetch(
      `${STRAVA_API_BASE}/activities/${id}/streams?keys=${STREAM_KEYS}&key_by_type=true`,
      { headers, cache: "no-store" }
    ),
  ]);

  if (!detailRes.ok) {
    return NextResponse.json(
      { error: "strava_error", status: detailRes.status },
      { status: 502 }
    );
  }

  const detail = (await detailRes.json()) as StravaActivityDetail;
  // Streams are optional — if the request fails (e.g. activity has no GPS),
  // we still return a parsed activity built from the session summary alone.
  const streams: StravaStreams = streamsRes.ok
    ? ((await streamsRes.json()) as StravaStreams)
    : {};

  const parts = stravaToParsed(detail, streams);
  return NextResponse.json({ parts });
}
