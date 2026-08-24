import type { LatLngTuple } from "leaflet";
import { OSRM_BASE_URL } from "@/lib/import/config";

/**
 * Road route between two points via OSRM. Returns [lat, lng] waypoints, thinned
 * to at most `maxPoints`, or null if routing fails (caller keeps a straight line).
 */
export async function roadRoute(from: LatLngTuple, to: LatLngTuple, maxPoints = 400): Promise<LatLngTuple[] | null> {
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "raffys-on-the-road-blog/1.0" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: string; routes?: { geometry: { coordinates: [number, number][] } }[] };
    const line = json.routes?.[0]?.geometry.coordinates;
    if (json.code !== "Ok" || !line?.length) return null;
    return thin(line.map(([lng, lat]) => [lat, lng] as LatLngTuple), maxPoints);
  } catch {
    return null;
  }
}

/** Keep first/last and every k-th point so the polyline stays light for the map. */
function thin(points: LatLngTuple[], maxPoints: number): LatLngTuple[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const out: LatLngTuple[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.round(i * step)]);
  return out;
}

// ---- stop legs -------------------------------------------------------------------

import { getStops, updateStop } from "@/lib/stops";

/**
 * Draw the road route into `stopId` from the chronologically previous stop, and
 * redraw the leg into the *following* stop too (it now starts here rather than
 * at the old predecessor). Returns true if this stop's own leg was drawn.
 */
export async function routeStopFromPrevious(stopId: string): Promise<boolean> {
  const all = await getStops(); // sorted by arrival
  const idx = all.findIndex((s) => s.id === stopId);
  if (idx < 0) return false;
  let ok = false;
  if (all[idx].flightLeg) {
    await updateStop(stopId, { journeyLatLongTuples: [] }); // flights have no road line
    ok = true;
  } else if (idx > 0) {
    const line = await roadRoute(all[idx - 1].latLongTuple, all[idx].latLongTuple);
    if (line) {
      await updateStop(stopId, { journeyLatLongTuples: line });
      ok = true;
    }
  } else {
    await updateStop(stopId, { journeyLatLongTuples: [] }); // first stop has no inbound leg
    ok = true;
  }
  if (idx < all.length - 1) {
    const next = all[idx + 1];
    if (!next.flightLeg) {
      const line = await roadRoute(all[idx].latLongTuple, next.latLongTuple);
      if (line) await updateStop(next.id, { journeyLatLongTuples: line });
    }
  }
  return ok;
}

/** Rebuild every leg in chronological order. `onlyEmpty` skips stops that already have waypoints. */
export async function rerouteAllStops(onlyEmpty = false): Promise<{ routed: number; failed: number; skipped: number }> {
  const all = await getStops();
  const result = { routed: 0, failed: 0, skipped: 0 };
  for (let i = 1; i < all.length; i++) {
    if (all[i].flightLeg) {
      if (all[i].journeyLatLongTuples.length > 0) await updateStop(all[i].id, { journeyLatLongTuples: [] });
      result.skipped++;
      continue;
    }
    if (onlyEmpty && all[i].journeyLatLongTuples.length > 0) {
      result.skipped++;
      continue;
    }
    const line = await roadRoute(all[i - 1].latLongTuple, all[i].latLongTuple);
    if (line) {
      await updateStop(all[i].id, { journeyLatLongTuples: line });
      result.routed++;
    } else {
      result.failed++;
    }
  }
  return result;
}
