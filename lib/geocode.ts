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

// ---- nearby named place (campground / park) via OpenStreetMap ----------------

export interface NearbyPlace {
  name: string;
  website: string | null;
  kind: string;
  distanceKm: number;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_URL = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

function distKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x = Math.sin(toRad(bLat - aLat) / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(toRad(bLon - aLon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Official website from Wikidata (property P856) for an OSM `wikidata` tag like "Q1234". */
async function wikidataWebsite(qid: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { entities?: Record<string, { claims?: { P856?: { mainsnak?: { datavalue?: { value?: string } } }[] } }> };
    return json.entities?.[qid]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * The most plausible named campground / park / RV park within `radiusM` of a
 * point, with its website when OSM or Wikidata knows it. Cached. Null if nothing
 * suitable is nearby or the service is down (never throws).
 */
export async function findNearbyPlace(lat: number, lng: number, radiusM = 2000): Promise<NearbyPlace | null> {
  const key = `place:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = db.select().from(geocodeCache).where(eq(geocodeCache.key, key)).get();
  if (cached) return (cached.raw as NearbyPlace | null) ?? null;

  const q = `[out:json][timeout:20];(
    nwr["tourism"~"camp_site|caravan_site"]["name"](around:${radiusM},${lat},${lng});
    nwr["leisure"~"park|nature_reserve"]["name"](around:${radiusM},${lat},${lng});
    nwr["boundary"~"national_park|protected_area"]["name"](around:${radiusM},${lat},${lng});
  );out tags center 30;`;

  let place: NearbyPlace | null = null;
  try {
    await politeDelay();
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "User-Agent": NOMINATIM_USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!res.ok) return null; // don't cache failures
    const { elements } = (await res.json()) as { elements: OverpassElement[] };

    let best: { el: OverpassElement; score: number; d: number } | null = null;
    for (const el of elements) {
      const t = el.tags ?? {};
      const name = t.name;
      if (!name) continue;
      const c = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
      if (!c) continue;
      const d = distKm(lat, lng, c.lat, c.lon);
      let score = 0;
      if (t.boundary === "national_park" || t.boundary === "protected_area") score += 4;
      if (t.leisure === "nature_reserve") score += 3;
      if (t.leisure === "park") score += 1; // city parks are usually a false positive near home
      if (t.tourism === "camp_site" || t.tourism === "caravan_site") score += 3;
      if (el.type !== "node") score += 1; // an area beats a pin
      if (/\b(group camp|loop|site \d|campsite \d|pavilion|picnic|playground|dog park|trailhead)\b/i.test(name)) score -= 4;
      if (/\b(state park|national park|national monument|national forest|recreation area|campground|rv park|rv resort|koa|state forest|wildlife)\b/i.test(name)) score += 2;
      if (t.website || t["contact:website"] || t.url || t.wikidata) score += 1;
      score -= d; // ~1 point per km
      if (!best || score > best.score) best = { el, score, d };
    }

    if (best) {
      const t = best.el.tags!;
      let website: string | null = t.website ?? t["contact:website"] ?? t.url ?? null;
      if (!website && t.wikidata) website = await wikidataWebsite(t.wikidata);
      place = {
        name: t.name!,
        website,
        kind: t.tourism ?? t.leisure ?? t.boundary ?? "place",
        distanceKm: +best.d.toFixed(2),
      };
    }
  } catch {
    return null;
  }

  db.insert(geocodeCache).values({ key, name: place?.name ?? "", raw: place }).onConflictDoNothing().run();
  return place;
}
