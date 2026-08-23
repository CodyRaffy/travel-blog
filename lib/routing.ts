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
