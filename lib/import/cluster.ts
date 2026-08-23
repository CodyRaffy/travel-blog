/**
 * Turn GPS-tagged photos into candidate stops.
 *
 * Algorithm (deliberately simple and explainable; everything goes to a review queue):
 *  1. Group located photos by calendar day. Each day's "place" is the centre of
 *     its densest ~5 km grid cell, computed from evening / early-morning photos
 *     when there are any (that's where you slept), otherwise from all photos.
 *  2. Walk days chronologically. A day extends the current cluster if its place
 *     is within CLUSTER_RADIUS_KM of the cluster centroid and the gap since the
 *     cluster's last day is <= CLUSTER_MAX_GAP_DAYS; otherwise a new cluster starts.
 *  3. Fold short excursions back into the stay they interrupt (base, 1-2 days
 *     elsewhere, same base again becomes one cluster).
 *  4. Clusters with fewer than CLUSTER_MIN_DAYS days AND fewer than
 *     CLUSTER_MIN_PHOTOS photos are dropped as lunch breaks / drive-bys.
 */
import { CLUSTER_RADIUS_KM, CLUSTER_MAX_GAP_DAYS, CLUSTER_MIN_DAYS, CLUSTER_MIN_PHOTOS } from "@/lib/import/config";

export interface LocatedPhoto {
  id: string;
  takenAt: string; // naive local ISO
  latitude: number;
  longitude: number;
}

export interface Cluster {
  latitude: number;
  longitude: number;
  arrivalDate: string; // "YYYY-MM-DD"
  departureDate: string;
  days: number;
  photoIds: string[];
}

export interface ClusterOptions {
  radiusKm?: number;
  maxGapDays?: number;
  minDays?: number;
  minPhotos?: number;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

interface DaySummary {
  day: string;
  latitude: number;
  longitude: number;
  photos: LocatedPhoto[];
}

const dayOf = (iso: string) => iso.slice(0, 10);
const dayNumber = (day: string) =>
  Math.round(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 86400000);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Hours when you are almost certainly at the place you sleep. */
const isHomeHour = (iso: string) => {
  const h = Number(iso.slice(11, 13));
  return h >= 19 || h < 8;
};

function summarizeDay(day: string, photos: LocatedPhoto[]): DaySummary {
  const home = photos.filter((p) => isHomeHour(p.takenAt));
  const basis = home.length >= 2 ? home : photos;
  const cells = new Map<string, LocatedPhoto[]>();
  for (const p of basis) {
    const key = `${Math.round(p.latitude / 0.05)},${Math.round(p.longitude / 0.05)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(p);
  }
  let best: LocatedPhoto[] = [];
  for (const group of cells.values()) if (group.length > best.length) best = group;
  return { day, latitude: mean(best.map((p) => p.latitude)), longitude: mean(best.map((p) => p.longitude)), photos };
}

interface Working {
  latSum: number;
  lonSum: number;
  n: number; // number of day-places averaged into the centroid
  first: string;
  last: string;
  dayCount: number;
  photoIds: string[];
}

const centroid = (c: Working) => [c.latSum / c.n, c.lonSum / c.n] as const;

function absorb(into: Working, ...others: Working[]) {
  for (const o of others) {
    into.latSum += o.latSum;
    into.lonSum += o.lonSum;
    into.n += o.n;
    into.dayCount += o.dayCount;
    into.photoIds.push(...o.photoIds);
    if (o.last > into.last) into.last = o.last;
    if (o.first < into.first) into.first = o.first;
  }
}

export function clusterPhotos(photos: LocatedPhoto[], opts: ClusterOptions = {}): Cluster[] {
  const radiusKm = opts.radiusKm ?? CLUSTER_RADIUS_KM;
  const maxGapDays = opts.maxGapDays ?? CLUSTER_MAX_GAP_DAYS;
  const minDays = opts.minDays ?? CLUSTER_MIN_DAYS;
  const minPhotos = opts.minPhotos ?? CLUSTER_MIN_PHOTOS;

  const byDay = new Map<string, LocatedPhoto[]>();
  for (const p of photos) {
    if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) continue;
    if (p.latitude === 0 && p.longitude === 0) continue; // bogus EXIF
    const d = dayOf(p.takenAt);
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(p);
  }
  const days = [...byDay.keys()].sort().map((d) => summarizeDay(d, byDay.get(d)!));

  // Step 2: chain days.
  const clusters: Working[] = [];
  let cur: Working | null = null;
  for (const d of days) {
    if (cur) {
      const [cLat, cLon] = centroid(cur);
      const near = haversineKm(cLat, cLon, d.latitude, d.longitude) <= radiusKm;
      const gap = dayNumber(d.day) - dayNumber(cur.last);
      if (near && gap <= maxGapDays) {
        cur.latSum += d.latitude;
        cur.lonSum += d.longitude;
        cur.n++;
        cur.last = d.day;
        cur.dayCount++;
        cur.photoIds.push(...d.photos.map((p) => p.id));
        continue;
      }
      clusters.push(cur);
    }
    cur = {
      latSum: d.latitude,
      lonSum: d.longitude,
      n: 1,
      first: d.day,
      last: d.day,
      dayCount: 1,
      photoIds: d.photos.map((p) => p.id),
    };
  }
  if (cur) clusters.push(cur);

  // Step 3: fold short excursions back into the stay they interrupt.
  for (let i = 1; i < clusters.length - 1; ) {
    const prev = clusters[i - 1];
    const mid = clusters[i];
    const next = clusters[i + 1];
    const [pLat, pLon] = centroid(prev);
    const [nLat, nLon] = centroid(next);
    const samePlace = haversineKm(pLat, pLon, nLat, nLon) <= radiusKm;
    const short = mid.dayCount <= 2 && dayNumber(next.first) - dayNumber(prev.last) <= maxGapDays + 2;
    if (samePlace && short) {
      absorb(prev, mid, next);
      clusters.splice(i, 2);
      if (i > 1) i--; // the merged cluster may now sandwich another excursion
    } else {
      i++;
    }
  }

  // Step 4: drop drive-bys.
  return clusters
    .filter((c) => c.dayCount >= minDays || c.photoIds.length >= minPhotos)
    .map((c) => ({
      latitude: +(c.latSum / c.n).toFixed(6),
      longitude: +(c.lonSum / c.n).toFixed(6),
      arrivalDate: c.first,
      departureDate: c.last,
      days: c.dayCount,
      photoIds: c.photoIds,
    }));
}
