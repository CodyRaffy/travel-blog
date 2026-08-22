import { NextRequest, NextResponse } from "next/server";
import {
  getPostCandidateById,
  approvePostCandidate,
  rejectPostCandidate,
  resetPostCandidate,
  updatePostCandidateSuggestion,
} from "@/lib/posts";

type RouteParams = { params: Promise<{ id: string }> };

interface CandidateAction {
  action: "approve" | "reject" | "reset" | "suggest";
  stopId?: string | null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const candidate = await getPostCandidateById(id);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  return NextResponse.json(candidate);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body: CandidateAction = await request.json();

  let result;
  switch (body.action) {
    case "approve":
      result = await approvePostCandidate(id, body.stopId);
      break;
    case "reject":
      result = await rejectPostCandidate(id);
      break;
    case "reset":
      result = await resetPostCandidate(id);
      break;
    case "suggest":
      result = await updatePostCandidateSuggestion(id, body.stopId ?? null);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (!result) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  return NextResponse.json(result);
}
