import { NextRequest, NextResponse } from "next/server";
import { getStopCandidates, getStopCandidateCounts, generateStopCandidates, bulkApproveStopCandidates } from "@/lib/stopCandidates";
import { homeLocation } from "@/data/ImportantMarkers";
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

/**
 * Body { action: "bulkApprove", minNights } approves every pending candidate with
 * that many nights using its suggested name. Otherwise re-clusters photos into
 * pending candidates (optional { radiusKm, minDays, minPhotos, maxGapDays }).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "bulkApprove") {
    const minNights = Math.max(1, Number(body.minNights ?? 3));
    const result = await bulkApproveStopCandidates(minNights, [homeLocation[0], homeLocation[1]]);
    return NextResponse.json(result);
  }
  const result = await generateStopCandidates({
    radiusKm: body.radiusKm,
    minDays: body.minDays,
    minPhotos: body.minPhotos,
    maxGapDays: body.maxGapDays,
  });
  return NextResponse.json(result);
}
