import { NextRequest, NextResponse } from "next/server";
import { getStopById, updateStop, deleteStop } from "@/lib/stops";
import { UpdateStopInput } from "@/models/StopInfo";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const stop = await getStopById(id);

  if (!stop) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(stop);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body: UpdateStopInput = await request.json();

  const updatedStop = await updateStop(id, body);

  if (!updatedStop) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json(updatedStop);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const deleted = await deleteStop(id);

  if (!deleted) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
