import { LatLngTuple } from "leaflet";

export interface StopInfo {
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
