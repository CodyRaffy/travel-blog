import { NextRequest, NextResponse } from "next/server";
import { reorderStopPhotos } from "@/lib/photos";

/** Admin: `{ stopId, orderedIds }` sets sortOrder for the stop's kept photos. */
export async function POST(request: NextRequest) {
  const { stopId, orderedIds } = (await request.json()) as { stopId?: string; orderedIds?: string[] };
  if (!stopId || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "stopId and orderedIds are required" }, { status: 400 });
  }
  await reorderStopPhotos(stopId, orderedIds);
  return NextResponse.json({ success: true });
}
