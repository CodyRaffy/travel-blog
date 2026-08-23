import { NextRequest, NextResponse } from "next/server";
import { getStopById } from "@/lib/stops";
import { routeStopFromPrevious } from "@/lib/routing";

type RouteParams = { params: Promise<{ id: string }> };

/** Replace this stop's journey waypoints with an OSRM road route from the previous stop. */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!(await getStopById(id))) return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  const routed = await routeStopFromPrevious(id);
  if (!routed) {
    return NextResponse.json({ error: "No previous stop, or routing service unavailable" }, { status: 422 });
  }
  return NextResponse.json(await getStopById(id));
}
