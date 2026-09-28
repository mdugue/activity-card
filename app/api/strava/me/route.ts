import { NextResponse } from "next/server";

import { readTokens } from "@/lib/strava-cookies";

export const GET = async () => {
  const tokens = await readTokens();
  if (!tokens) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    athlete: tokens.athlete ?? null,
    connected: true,
  });
};
