import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/strava-cookies";

export async function POST() {
  await clearTokens();
  return new NextResponse(null, { status: 204 });
}
