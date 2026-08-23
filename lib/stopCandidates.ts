import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { StopCandidateRow } from "@/lib/db/schema";
import { clusterPhotos, type ClusterOptions } from "@/lib/import/cluster";
import { reverseGeocode } from "@/lib/geocode";
import { roadRoute } from "@/lib/routing";
import { createStop, getStops, updateStop } from "@/lib/stops";
import type { StopInfoResponse } from "@/models/StopInfo";
import type { StopCandidateResponse, StopCandidateStatus } from "@/models/StopCandidate";

const { stopCandidates, photos, stops } = schema;

function toResponse(row: StopCandidateRow): StopCandidateResponse {
  return {
    id: row.id,
    suggestedName: row.suggestedName,
    latLongTuple: [row.latitude, row.longitude],
    arrivalDate: row.arrivalDate,
    departureDate: row.departureDate,
    photoCount: row.photoCount,
    status: row.status as StopCandidateStatus,
    stopId: row.stopId,
    mergedIntoId: row.mergedIntoId,
  };
}

const DAY_MS = 86400000;
const overlaps = (a1: string, a2: string, b1: string, b2: string) => a1.slice(0, 10) <= b2.slice(0, 10) && b1.slice(0, 10) <= a2.slice(0, 10);

export interface GenerateResult {
  clusters: number;
  proposed: number;
  skippedAlreadyHandled: number;
  geocoded: number;
}

/**
 * Re-cluster all located photos into candidates.
 * - Replaces the current `pending` candidates (they are derived data).
 * - Skips clusters whose dates overlap an existing stop or an approved/rejected
 *   candidate, so decisions already made are never re-proposed.
 * - Reverse-geocodes each new candidate (cached; skips silently if offline).
 */
export async function generateStopCandidates(
  opts: ClusterOptions & { geocode?: boolean; onProgress?: (m: string) => void } = {}
): Promise<GenerateResult> {
  const log = opts.onProgress ?? (() => {});
  const located = db
    .select({ id: photos.id, takenAt: photos.takenAt, latitude: photos.latitude, longitude: photos.longitude })
    .from(photos)
    .where(and(isNotNull(photos.latitude), isNotNull(photos.longitude), isNotNull(photos.takenAt)))
    .all() as { id: string; takenAt: string; latitude: number; longitude: number }[];
  log(`${located.length} located photos`);

  const clusters = clusterPhotos(located, opts);
  log(`${clusters.length} clusters`);

  const handled = [
    ...db.select({ a: stops.arrivalDate, d: stops.departureDate }).from(stops).all(),
    ...db
      .select({ a: stopCandidates.arrivalDate, d: stopCandidates.departureDate })
      .from(stopCandidates)
      .where(ne(stopCandidates.status, "pending"))
      .all(),
  ];

  db.delete(stopCandidates).where(eq(stopCandidates.status, "pending")).run();

  const result: GenerateResult = { clusters: clusters.length, proposed: 0, skippedAlreadyHandled: 0, geocoded: 0 };
  for (const c of clusters) {
    if (handled.some((h) => overlaps(c.arrivalDate, c.departureDate, h.a, h.d))) {
      result.skippedAlreadyHandled++;
      continue;
    }
    let name: string | null = null;
    if (opts.geocode !== false) {
      name = await reverseGeocode(c.latitude, c.longitude);
      if (name) result.geocoded++;
    }
    db.insert(stopCandidates)
      .values({
        id: crypto.randomUUID(),
        suggestedName: name,
        latitude: c.latitude,
        longitude: c.longitude,
        arrivalDate: `${c.arrivalDate}T00:00:00.000Z`,
        departureDate: `${c.departureDate}T00:00:00.000Z`,
        photoCount: c.photoIds.length,
        photoIds: c.photoIds,
        status: "pending",
      })
      .run();
    result.proposed++;
    if (result.proposed % 10 === 0) log(`proposed ${result.proposed}…`);
  }
  return result;
}

export async function getStopCandidates(status?: StopCandidateStatus): Promise<StopCandidateResponse[]> {
  const q = db.select().from(stopCandidates);
  return (status ? q.where(eq(stopCandidates.status, status)) : q)
    .orderBy(asc(stopCandidates.arrivalDate))
    .all()
    .map(toResponse);
}

export async function getStopCandidateCounts(): Promise<Record<StopCandidateStatus, number>> {
  const counts = { pending: 0, approved: 0, rejected: 0, merged: 0 };
  for (const r of db.select({ status: stopCandidates.status }).from(stopCandidates).all())
    counts[r.status as StopCandidateStatus]++;
  return counts;
}

/** Sample of a candidate's photos for the review card (evenly spread across the stay). */
export async function getCandidatePhotos(id: string, limit = 12) {
  const cand = db.select({ photoIds: stopCandidates.photoIds }).from(stopCandidates).where(eq(stopCandidates.id, id)).get();
  if (!cand) return null;
  const ids = cand.photoIds;
  if (ids.length === 0) return [];
  const step = Math.max(1, Math.floor(ids.length / limit));
  const sample = ids.filter((_, i) => i % step === 0).slice(0, limit);
  return db
    .select({ id: photos.id, path: photos.dropboxPath, takenAt: photos.takenAt, width: photos.width, height: photos.height })
    .from(photos)
    .where(inArray(photos.id, sample))
    .orderBy(asc(photos.takenAt))
    .all();
}

export async function updateStopCandidate(
  id: string,
  patch: { suggestedName?: string | null; latLongTuple?: [number, number]; arrivalDate?: string; departureDate?: string }
): Promise<StopCandidateResponse | null> {
  const set: Partial<typeof stopCandidates.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (patch.suggestedName !== undefined) set.suggestedName = patch.suggestedName;
  if (patch.latLongTuple) [set.latitude, set.longitude] = patch.latLongTuple;
  if (patch.arrivalDate) set.arrivalDate = patch.arrivalDate;
  if (patch.departureDate) set.departureDate = patch.departureDate;
  const row = db.update(stopCandidates).set(set).where(eq(stopCandidates.id, id)).returning().get();
  return row ? toResponse(row) : null;
}

export async function rejectStopCandidate(id: string): Promise<StopCandidateResponse | null> {
  const row = db
    .update(stopCandidates)
    .set({ status: "rejected", updatedAt: new Date().toISOString() })
    .where(eq(stopCandidates.id, id))
    .returning()
    .get();
  return row ? toResponse(row) : null;
}

export async function resetStopCandidate(id: string): Promise<StopCandidateResponse | null> {
  const row = db
    .update(stopCandidates)
    .set({ status: "pending", mergedIntoId: null, updatedAt: new Date().toISOString() })
    .where(eq(stopCandidates.id, id))
    .returning()
    .get();
  return row ? toResponse(row) : null;
}

/** Merge `sourceIds` into `targetId`: union photos, widen dates, keep target's name/location. */
export async function mergeStopCandidates(targetId: string, sourceIds: string[]): Promise<StopCandidateResponse | null> {
  const target = db.select().from(stopCandidates).where(eq(stopCandidates.id, targetId)).get();
  if (!target) return null;
  const sources = db
    .select()
    .from(stopCandidates)
    .where(and(inArray(stopCandidates.id, sourceIds.filter((s) => s !== targetId)), eq(stopCandidates.status, "pending")))
    .all();
  if (sources.length === 0) return toResponse(target);

  const all = [target, ...sources];
  const photoIds = [...new Set(all.flatMap((c) => c.photoIds))];
  const arrival = all.map((c) => c.arrivalDate).sort()[0];
  const departure = all.map((c) => c.departureDate).sort().at(-1)!;
  const now = new Date().toISOString();

  const row = db.transaction((tx) => {
    for (const s of sources) {
      tx.update(stopCandidates)
        .set({ status: "merged", mergedIntoId: targetId, updatedAt: now })
        .where(eq(stopCandidates.id, s.id))
        .run();
    }
    return tx
      .update(stopCandidates)
      .set({ photoIds, photoCount: photoIds.length, arrivalDate: arrival, departureDate: departure, updatedAt: now })
      .where(eq(stopCandidates.id, targetId))
      .returning()
      .get();
  });
  return row ? toResponse(row) : null;
}

export interface ApproveInput {
  name?: string;
  latLongTuple?: [number, number];
  arrivalDate?: string;
  departureDate?: string;
  link?: string;
  statePark?: boolean;
  nationalMonument?: boolean;
  nationalPark?: boolean;
  /** Generate the road route from the previous stop (default true). */
  route?: boolean;
}

/**
 * Approve: create a real stop, attach the cluster's photos (and any unlocated
 * photos inside the date range), and draw the road route from the previous stop.
 */
export async function approveStopCandidate(
  id: string,
  input: ApproveInput = {}
): Promise<{ candidate: StopCandidateResponse; stop: StopInfoResponse; routed: boolean } | null> {
  const cand = db.select().from(stopCandidates).where(eq(stopCandidates.id, id)).get();
  if (!cand) return null;
  if (cand.status === "approved" && cand.stopId) {
    const existing = (await getStops()).find((s) => s.id === cand.stopId);
    if (existing) return { candidate: toResponse(cand), stop: existing, routed: false };
  }

  const name = input.name?.trim() || cand.suggestedName || `${cand.latitude.toFixed(3)}, ${cand.longitude.toFixed(3)}`;
  const stop = await createStop({
    name,
    latLongTuple: input.latLongTuple ?? [cand.latitude, cand.longitude],
    link: input.link ?? "",
    statePark: input.statePark ?? false,
    nationalMonument: input.nationalMonument ?? false,
    nationalPark: input.nationalPark ?? false,
    arrivalDate: input.arrivalDate ?? cand.arrivalDate,
    departureDate: input.departureDate ?? cand.departureDate,
  });

  const now = new Date().toISOString();
  db.transaction((tx) => {
    if (cand.photoIds.length) {
      tx.update(photos).set({ stopId: stop.id, updatedAt: now }).where(inArray(photos.id, cand.photoIds)).run();
    }
    // Unlocated photos taken during the stay inherit the stop (departure day inclusive).
    const end = new Date(new Date(stop.departureDate).getTime() + DAY_MS).toISOString().slice(0, 19);
    tx.update(photos)
      .set({ stopId: stop.id, updatedAt: now })
      .where(
        and(
          sql`${photos.stopId} is null`,
          sql`${photos.latitude} is null`,
          sql`${photos.takenAt} >= ${stop.arrivalDate.slice(0, 19)}`,
          sql`${photos.takenAt} < ${end}`
        )
      )
      .run();
    tx.update(stopCandidates)
      .set({ status: "approved", stopId: stop.id, updatedAt: now })
      .where(eq(stopCandidates.id, id))
      .run();
  });

  let routed = false;
  if (input.route !== false) routed = await routeStopFromPrevious(stop.id);

  const updated = db.select().from(stopCandidates).where(eq(stopCandidates.id, id)).get()!;
  const finalStop = (await getStops()).find((s) => s.id === stop.id)!;
  return { candidate: toResponse(updated), stop: finalStop, routed };
}

/** Draw the road route into `stopId` from the stop that precedes it chronologically. */
export async function routeStopFromPrevious(stopId: string): Promise<boolean> {
  const all = await getStops(); // sorted by arrival
  const idx = all.findIndex((s) => s.id === stopId);
  if (idx <= 0) return false;
  const prev = all[idx - 1];
  const cur = all[idx];
  const line = await roadRoute(prev.latLongTuple, cur.latLongTuple);
  if (!line) return false;
  await updateStop(stopId, { journeyLatLongTuples: line });
  // If a later stop used to follow `prev`, its route now needs to start here.
  return true;
}
