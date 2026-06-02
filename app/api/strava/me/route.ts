import { NextResponse } from "next/server";
import { readTokens } from "@/lib/strava-cookies";

export async function GET() {
  const tokens = await readTokens();
  if (!tokens) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    athlete: tokens.athlete ?? null,
  });
}
