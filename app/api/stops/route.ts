import { NextRequest, NextResponse } from "next/server";
import { getStops, createStop, getStopById } from "@/lib/stops";
import { routeStopFromPrevious } from "@/lib/routing";
import { CreateStopInput } from "@/models/StopInfo";

export async function GET() {
  const stops = await getStops();
  return NextResponse.json(stops);
}

export async function POST(request: NextRequest) {
  const body: CreateStopInput = await request.json();

  const newStop = await createStop(body);
  // Draw the road route from the previous stop (and fix the following leg) automatically.
  await routeStopFromPrevious(newStop.id);
  return NextResponse.json((await getStopById(newStop.id)) ?? newStop, { status: 201 });
}
