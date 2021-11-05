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
  polyline: LatLngTuple[] | null;
}
