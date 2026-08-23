import { NextRequest, NextResponse } from "next/server";
import {
  approveStopCandidate,
  mergeStopCandidates,
  rejectStopCandidate,
  resetStopCandidate,
  updateStopCandidate,
  lookupStopCandidatePlace,
  type ApproveInput,
} from "@/lib/stopCandidates";

type RouteParams = { params: Promise<{ id: string }> };

type Action =
  | ({ action: "approve" } & ApproveInput)
  | { action: "reject" }
  | { action: "reset" }
  | { action: "lookup" }
  | { action: "merge"; sourceIds: string[] }
  | {
      action: "update";
      suggestedName?: string | null;
      suggestedLink?: string | null;
      latLongTuple?: [number, number];
      arrivalDate?: string;
      departureDate?: string;
    };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as Action;

  let result;
  switch (body.action) {
    case "approve": {
      const { action: _a, ...input } = body;
      result = await approveStopCandidate(id, input);
      break;
    }
    case "reject":
      result = await rejectStopCandidate(id);
      break;
    case "reset":
      result = await resetStopCandidate(id);
      break;
    case "lookup":
      result = await lookupStopCandidatePlace(id);
      break;
    case "merge":
      result = await mergeStopCandidates(id, body.sourceIds ?? []);
      break;
    case "update": {
      const { action: _a, ...patch } = body;
      result = await updateStopCandidate(id, patch);
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (!result) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  return NextResponse.json(result);
}
