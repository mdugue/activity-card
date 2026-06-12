import { NextResponse } from "next/server";
import {
  stravaErrorResponse,
  stravaFetch,
  stravaFetchOptional,
} from "@/lib/strava-client";
import { ensureFreshToken } from "@/lib/strava-cookies";
import { stravaToParsed } from "@/lib/strava-to-parsed";
import type {
  StravaActivityDetail,
  StravaPhotoListItem,
  StravaStreams,
} from "@/lib/strava-types";

const STREAM_KEYS =
  "latlng,altitude,heartrate,cadence,velocity_smooth,time,distance";
const NUMERIC_ID = /^\d+$/;
// Thumbnail size for the photo strip; activation fetches the full size
// through /api/strava/photo.
const PHOTO_PREVIEW_SIZE = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!NUMERIC_ID.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    // Mint once and share — the calls run in parallel and must not each
    // trigger a token refresh.
    const token = await ensureFreshToken();
    const [detail, streams, photoList] = await Promise.all([
      stravaFetch<StravaActivityDetail>(`/activities/${id}`, { token }),
      // Streams are optional — if they fail (e.g. activity has no GPS) we
      // still return a parsed activity built from the session summary alone.
      stravaFetchOptional<StravaStreams>(
        `/activities/${id}/streams?keys=${STREAM_KEYS}&key_by_type=true`,
        { token }
      ),
      // Photos are optional too — the endpoint 404s for photo-less
      // activities on some accounts, and a missing strip is not an error.
      stravaFetchOptional<StravaPhotoListItem[]>(
        `/activities/${id}/photos?size=${PHOTO_PREVIEW_SIZE}&photo_sources=true`,
        { token }
      ),
    ]);

    const parts = stravaToParsed(detail, streams ?? {});
    const photos = (photoList ?? []).flatMap((photo, index) => {
      const previewUrl = photo.urls ? Object.values(photo.urls)[0] : undefined;
      return previewUrl ? [{ activityId: Number(id), index, previewUrl }] : [];
    });
    if (photos.length > 0 && parts[0]) {
      parts[0].stravaPhotos = photos;
    }
    return NextResponse.json({ parts });
  } catch (err) {
    return stravaErrorResponse(err);
  }
}
