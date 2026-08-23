import type { StopInfoResponse } from "@/models/StopInfo";

/**
 * Stop categories. Each is a boolean column on `stops`; adding one means:
 * schema.ts column + migration, models/StopInfo.ts, lib/stops.ts mapping, and a
 * line here. Forms, lists and badges render from this list.
 */
export interface StopCategory {
  key: keyof StopCategoryFlags;
  label: string;
  /** Short label for public badges. */
  badge: string;
  help?: string;
}

export type StopCategoryFlags = Pick<
  StopInfoResponse,
  "statePark" | "nationalPark" | "nationalMonument" | "armyCorps" | "overnightStop" | "homeBase" | "cityStop"
>;

export const STOP_CATEGORIES: StopCategory[] = [
  { key: "statePark", label: "State Park", badge: "State Park" },
  { key: "nationalPark", label: "National Park", badge: "National Park" },
  { key: "nationalMonument", label: "National Monument", badge: "National Monument" },
  {
    key: "armyCorps",
    label: "Army Corps of Engineers",
    badge: "Army Corps",
    help: "A U.S. Army Corps of Engineers campground or recreation area (usually on a reservoir).",
  },
  {
    key: "overnightStop",
    label: "Overnight Stop",
    badge: "Overnight",
    help: "A place you only slept, not a destination: Harvest Hosts, Cracker Barrel or Walmart lots, boondocking, rest areas, a one-night campsite on the way somewhere. Shown as a small dot on the map.",
  },
  {
    key: "homeBase",
    label: "Home Base",
    badge: "Home base",
    help: "Back at home base in Tallahassee between legs of the trip. Shown with the house icon on the map.",
  },
  {
    key: "cityStop",
    label: "City / Town",
    badge: "City",
    help: "A city or town visit: the place itself was the point (sightseeing, family, errands), not a park or campground.",
  },
];

export const CATEGORY_KEYS = STOP_CATEGORIES.map((c) => c.key);

export function categoryBadges(stop: StopCategoryFlags): string[] {
  return STOP_CATEGORIES.filter((c) => stop[c.key]).map((c) => c.badge);
}

export function emptyFlags(): StopCategoryFlags {
  return Object.fromEntries(CATEGORY_KEYS.map((k) => [k, false])) as unknown as StopCategoryFlags;
}
