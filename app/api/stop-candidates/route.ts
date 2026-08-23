import { NextRequest, NextResponse } from "next/server";
import { getStopCandidates, getStopCandidateCounts, generateStopCandidates } from "@/lib/stopCandidates";
import { photoLibraryStats } from "@/lib/import/photoScan";
import { StopCandidateStatus } from "@/models/StopCandidate";

export async function GET(request: NextRequest) {
  const status = (request.nextUrl.searchParams.get("status") ?? undefined) as StopCandidateStatus | undefined;
  const counts = await getStopCandidateCounts();
  const library = photoLibraryStats();
  if (request.nextUrl.searchParams.get("countsOnly") === "true") {
    return NextResponse.json({ candidates: [], counts, library });
  }
  return NextResponse.json({ candidates: await getStopCandidates(status), counts, library });
}

/** Re-cluster photos into pending candidates. Body: optional { radiusKm, minDays, minPhotos, maxGapDays }. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await generateStopCandidates({
    radiusKm: body.radiusKm,
    minDays: body.minDays,
    minPhotos: body.minPhotos,
    maxGapDays: body.maxGapDays,
  });
  return NextResponse.json(result);
}
