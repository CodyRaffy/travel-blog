import { NextRequest, NextResponse } from "next/server";
import { getStopById } from "@/lib/stops";
import { suggestStopPhotos, stopPhotoCounts } from "@/lib/photos";

type RouteParams = { params: Promise<{ id: string }> };

/** Admin: (re)compute suggested photos for a stop. `?target=8` */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!(await getStopById(id))) return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  const target = Math.min(40, Math.max(1, Number(request.nextUrl.searchParams.get("target") ?? 8)));
  const suggested = await suggestStopPhotos(id, target);
  return NextResponse.json({ suggested, counts: await stopPhotoCounts(id) });
}
