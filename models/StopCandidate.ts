import type { LatLngTuple } from "leaflet";

export type StopCandidateStatus = "pending" | "approved" | "rejected" | "merged";

export interface StopCandidateResponse {
  id: string;
  suggestedName: string | null;
  suggestedLink: string | null;
  latLongTuple: LatLngTuple;
  arrivalDate: string;
  departureDate: string;
  photoCount: number;
  status: StopCandidateStatus;
  stopId: string | null;
  mergedIntoId: string | null;
}

export interface CandidatePhoto {
  id: string;
  path: string;
  takenAt: string | null;
  width: number | null;
  height: number | null;
}
