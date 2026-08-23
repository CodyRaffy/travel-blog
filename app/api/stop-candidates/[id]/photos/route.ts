import { NextRequest, NextResponse } from "next/server";
import { getCandidatePhotos } from "@/lib/stopCandidates";

type RouteParams = { params: Promise<{ id: string }> };

/** Evenly spaced sample of the candidate's photos (`?limit=12`), or every photo with `?limit=all`. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const raw = request.nextUrl.searchParams.get("limit") ?? "12";
  const limit = raw === "all" ? Number.MAX_SAFE_INTEGER : Math.min(48, Number(raw) || 12);
  const photos = await getCandidatePhotos(id, limit);
  if (!photos) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  return NextResponse.json(photos);
}
