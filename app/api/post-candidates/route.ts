import { NextRequest, NextResponse } from "next/server";
import { getPostCandidates, getCandidateCounts, relinkPendingCandidates } from "@/lib/posts";
import { PostCandidateStatus } from "@/models/Post";

export async function GET(request: NextRequest) {
  const status = (request.nextUrl.searchParams.get("status") ?? undefined) as PostCandidateStatus | undefined;
  const counts = await getCandidateCounts();
  if (request.nextUrl.searchParams.get("countsOnly") === "true") {
    return NextResponse.json({ candidates: [], counts });
  }
  return NextResponse.json({ candidates: await getPostCandidates(status), counts });
}

/** Re-run stop suggestions for pending candidates (after stops change). */
export async function POST() {
  const changed = await relinkPendingCandidates();
  return NextResponse.json({ changed });
}
