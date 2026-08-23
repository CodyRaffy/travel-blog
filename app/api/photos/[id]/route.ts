import { NextRequest, NextResponse } from "next/server";
import { setCuration } from "@/lib/photos";
import { CurationStatus } from "@/models/Photo";

type RouteParams = { params: Promise<{ id: string }> };

/** Admin: `{ curationStatus?, caption?, sortOrder? }`. Keeping a photo renders its web variants. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as { curationStatus?: CurationStatus; caption?: string | null; sortOrder?: number };
  try {
    const photo = await setCuration(id, body);
    if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    return NextResponse.json(photo);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
