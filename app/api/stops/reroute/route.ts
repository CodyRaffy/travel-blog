import { NextRequest, NextResponse } from "next/server";
import { rerouteAllStops } from "@/lib/routing";

/** Admin: rebuild every journey leg with OSRM in chronological order. `?onlyEmpty=true` keeps existing waypoints. */
export async function POST(request: NextRequest) {
  const onlyEmpty = request.nextUrl.searchParams.get("onlyEmpty") === "true";
  return NextResponse.json(await rerouteAllStops(onlyEmpty));
}
