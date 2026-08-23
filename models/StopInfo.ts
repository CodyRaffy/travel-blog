import { LatLngTuple } from "leaflet";

export interface StopInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  latLongTuple: LatLngTuple;
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  armyCorps: boolean;
  overnightStop: boolean;
  homeBase: boolean;
  cityStop: boolean;
  arrivalDate: Date;
  departureDate: Date;
  journeyLatLongTuples: LatLngTuple[];
  coverPhotoId: string | null;
}

// API response type with serialized dates
export interface StopInfoResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  latLongTuple: LatLngTuple;
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  armyCorps: boolean;
  overnightStop: boolean;
  homeBase: boolean;
  cityStop: boolean;
  arrivalDate: string;
  departureDate: string;
  journeyLatLongTuples: LatLngTuple[];
  coverPhotoId: string | null;
  /** Public URL of the cover image (medium variant), derived. */
  coverUrl: string | null;
}

// Type for creating a new stop (no id, no journey waypoints yet; slug derived from name)
export interface CreateStopInput {
  name: string;
  description?: string | null;
  latLongTuple: LatLngTuple;
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  armyCorps: boolean;
  overnightStop: boolean;
  homeBase: boolean;
  cityStop: boolean;
  arrivalDate: string;
  departureDate: string;
}

// Type for updating a stop
export interface UpdateStopInput {
  name?: string;
  description?: string | null;
  latLongTuple?: LatLngTuple;
  link?: string;
  statePark?: boolean;
  nationalMonument?: boolean;
  nationalPark?: boolean;
  armyCorps?: boolean;
  overnightStop?: boolean;
  homeBase?: boolean;
  cityStop?: boolean;
  arrivalDate?: string;
  departureDate?: string;
  journeyLatLongTuples?: LatLngTuple[];
  coverPhotoId?: string | null;
}
