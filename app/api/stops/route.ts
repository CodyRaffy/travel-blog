import { NextRequest, NextResponse } from "next/server";
import { getStops, createStop, getStopById, setVehicleForRange } from "@/lib/stops";
import { VEHICLE_KEYS, type VehicleKey } from "@/lib/vehicles";
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

/** Admin: set the vehicle for every stop arriving between two dates. Body { vehicle, from, to }. */
export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { vehicle?: string; from?: string; to?: string };
  if (!body.vehicle || !VEHICLE_KEYS.includes(body.vehicle as VehicleKey) || !body.from || !body.to) {
    return NextResponse.json({ error: "vehicle, from and to are required" }, { status: 400 });
  }
  const updated = await setVehicleForRange(body.vehicle as VehicleKey, body.from, body.to);
  return NextResponse.json({ updated });
}
