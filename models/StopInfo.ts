import { LatLngTuple } from "leaflet";

export interface StopInfo {
  id: string;
  name: string;
  latLongTuple: LatLngTuple;
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  arrivalDate: Date;
  departureDate: Date;
  journeyLatLongTuples: LatLngTuple[];
}

// API response type with serialized dates
export interface StopInfoResponse {
  id: string;
  name: string;
  latLongTuple: LatLngTuple;
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  arrivalDate: string;
  departureDate: string;
  journeyLatLongTuples: LatLngTuple[];
}

// Type for creating a new stop (no id, no journey waypoints yet)
export interface CreateStopInput {
  name: string;
  latLongTuple: LatLngTuple;
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  arrivalDate: string;
  departureDate: string;
}

// Type for updating a stop
export interface UpdateStopInput {
  name?: string;
  latLongTuple?: LatLngTuple;
  link?: string;
  statePark?: boolean;
  nationalMonument?: boolean;
  nationalPark?: boolean;
  arrivalDate?: string;
  departureDate?: string;
  journeyLatLongTuples?: LatLngTuple[];
}
