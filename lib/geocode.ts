import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { NOMINATIM_USER_AGENT } from "@/lib/import/config";

const { geocodeCache } = schema;

const US_STATES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
  Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};

let lastRequest = 0;
async function politeDelay() {
  const wait = lastRequest + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

interface NominatimAddress {
  leisure?: string;
  tourism?: string;
  amenity?: string;
  park?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country_code?: string;
}

/** "Moab, UT" / "Arches National Park, UT" style short name from a Nominatim result. */
function shortName(a: NominatimAddress, displayName: string): string {
  const place = a.leisure ?? a.tourism ?? a.park ?? a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.county;
  const region = a.country_code === "us" && a.state ? US_STATES[a.state] ?? a.state : a.state;
  if (place && region) return `${place}, ${region}`;
  if (place) return place;
  return displayName.split(",").slice(0, 2).join(",").trim();
}

/**
 * Reverse geocode with a DB cache. Coordinates are rounded to ~1 km so nearby
 * lookups share a cache entry. Returns null on network failure (caller falls back
 * to raw coordinates) — never throws.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = db.select().from(geocodeCache).where(eq(geocodeCache.key, key)).get();
  if (cached) return cached.name;

  try {
    await politeDelay();
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { display_name?: string; address?: NominatimAddress; error?: string };
    if (json.error || !json.address) return null;
    const name = shortName(json.address, json.display_name ?? "");
    db.insert(geocodeCache).values({ key, name, raw: json }).onConflictDoNothing().run();
    return name;
  } catch {
    return null;
  }
}
