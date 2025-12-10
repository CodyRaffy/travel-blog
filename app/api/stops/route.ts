import { NextRequest, NextResponse } from "next/server";
import { getStops, createStop } from "@/lib/stops";
import { CreateStopInput } from "@/models/StopInfo";

export async function GET() {
  const stops = await getStops();
  return NextResponse.json(stops);
}

export async function POST(request: NextRequest) {
  const body: CreateStopInput = await request.json();

  const newStop = await createStop(body);
  return NextResponse.json(newStop, { status: 201 });
}
