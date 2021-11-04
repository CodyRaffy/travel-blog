import { LatLngTuple } from "leaflet";

export interface StopInfo {
  name: string;
  latLongTuple: LatLngTuple;
  link: string;
  statePark: boolean;
  nationalPark: boolean;
  nationalMonument: boolean;
  arrivalDate: Date;
  departureDate: Date;
}
