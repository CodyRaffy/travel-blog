import { NextRequest, NextResponse } from "next/server";
import { listStopPhotos, stopPhotoCounts } from "@/lib/photos";
import { CurationStatus } from "@/models/Photo";

/** Admin: photos attached to a stop. `?stopId=&status=unreviewed|suggested|kept|skipped` */
export async function GET(request: NextRequest) {
  const stopId = request.nextUrl.searchParams.get("stopId");
  if (!stopId) return NextResponse.json({ error: "stopId is required" }, { status: 400 });
  const status = (request.nextUrl.searchParams.get("status") ?? undefined) as CurationStatus | undefined;
  const [photos, counts] = await Promise.all([listStopPhotos(stopId, status), stopPhotoCounts(stopId)]);
  return NextResponse.json({ photos, counts });
}
