import { LatLngTuple } from "leaflet";

export const centerOfUsa: LatLngTuple = [40.07656283137699, -98.94651206855815];

/**
 * Where "home" was over time. Used to pre-tick the Home Base checkbox on
 * candidates, place bulk-approved home stays, and label them.
 */
export interface HomeEra {
  /** Inclusive start (YYYY-MM-DD); first era has no lower bound. */
  from: string | null;
  name: string;
  latLng: LatLngTuple;
}

export const HOME_ERAS: HomeEra[] = [
  // Kilkierane house, sold 2022-06-15
  { from: null, name: "Home base · Tallahassee (Kilkierane)", latLng: [30.516974975572815, -84.22185018565166] },
  // Between houses: Monticello KOA (Tallahassee East)
  { from: "2022-06-15", name: "Home base · Monticello KOA", latLng: [30.476, -83.916] },
  // 2518 Killarney Way, purchased April 2024
  { from: "2024-04-01", name: "Home base · Tallahassee (Killarney Way)", latLng: [30.5120133, -84.2297132] },
];

export function homeEraAt(dateIso: string): HomeEra {
  const d = dateIso.slice(0, 10);
  let era = HOME_ERAS[0];
  for (const e of HOME_ERAS) if (e.from === null || d >= e.from) era = e;
  return era;
}

/** The current home (for the standalone map marker when no home-base stops exist). */
export const homeLocation: LatLngTuple = HOME_ERAS[HOME_ERAS.length - 1].latLng;
