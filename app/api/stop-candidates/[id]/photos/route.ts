import { NextRequest, NextResponse } from "next/server";
import { getCandidatePhotos } from "@/lib/stopCandidates";

type RouteParams = { params: Promise<{ id: string }> };

/** Evenly spaced sample of the candidate's photos (`?limit=12`). */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const limit = Math.min(48, Number(request.nextUrl.searchParams.get("limit") ?? 12));
  const photos = await getCandidatePhotos(id, limit);
  if (!photos) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  return NextResponse.json(photos);
}
