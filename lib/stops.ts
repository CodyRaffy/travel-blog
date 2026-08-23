import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { StopRow } from "@/lib/db/schema";
import { mediaUrl } from "@/lib/media";
import { StopInfoResponse, CreateStopInput, UpdateStopInput } from "@/models/StopInfo";
import { slugify } from "@/lib/slug";
import { DEFAULT_VEHICLE, type VehicleKey } from "@/lib/vehicles";

const { stops, photos } = schema;

/** Public URL of the cover photo's medium variant, or the first kept photo's, if any. */
function coverUrlFor(row: StopRow): string | null {
  const pick = row.coverPhotoId
    ? db.select({ v: photos.variants }).from(photos).where(eq(photos.id, row.coverPhotoId)).get()
    : db
        .select({ v: photos.variants })
        .from(photos)
        .where(eq(photos.stopId, row.id))
        .orderBy(asc(photos.sortOrder))
        .all()
        .find((p) => p.v);
  return pick?.v ? mediaUrl(pick.v.medium) : null;
}

function toResponse(row: StopRow): StopInfoResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    latLongTuple: [row.latitude, row.longitude],
    link: row.link,
    statePark: row.statePark,
    nationalMonument: row.nationalMonument,
    nationalPark: row.nationalPark,
    armyCorps: row.armyCorps,
    overnightStop: row.overnightStop,
    homeBase: row.homeBase,
    cityStop: row.cityStop,
    vehicle: row.vehicle as VehicleKey,
    arrivalDate: row.arrivalDate,
    departureDate: row.departureDate,
    journeyLatLongTuples: row.journeyLatLongTuples,
    coverPhotoId: row.coverPhotoId,
    coverUrl: coverUrlFor(row),
  };
}

/** Returns a slug derived from `name` that no other stop (except `excludeId`) is using. */
function uniqueSlug(name: string, excludeId?: string): string {
  const base = slugify(name) || "stop";
  const taken = new Set(
    db
      .select({ id: stops.id, slug: stops.slug })
      .from(stops)
      .all()
      .filter((s) => s.id !== excludeId)
      .map((s) => s.slug)
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function getStops(): Promise<StopInfoResponse[]> {
  return db.select().from(stops).orderBy(asc(stops.arrivalDate)).all().map(toResponse);
}

export async function getStopById(id: string): Promise<StopInfoResponse | null> {
  const row = db.select().from(stops).where(eq(stops.id, id)).get();
  return row ? toResponse(row) : null;
}

export async function getStopBySlug(slug: string): Promise<StopInfoResponse | null> {
  const row = db.select().from(stops).where(eq(stops.slug, slug)).get();
  return row ? toResponse(row) : null;
}

export async function createStop(input: CreateStopInput): Promise<StopInfoResponse> {
  const row = db
    .insert(stops)
    .values({
      id: crypto.randomUUID(),
      slug: uniqueSlug(input.name),
      name: input.name,
      description: input.description ?? null,
      latitude: input.latLongTuple[0],
      longitude: input.latLongTuple[1],
      link: input.link ?? "",
      statePark: input.statePark ?? false,
      nationalMonument: input.nationalMonument ?? false,
      nationalPark: input.nationalPark ?? false,
      armyCorps: input.armyCorps ?? false,
      overnightStop: input.overnightStop ?? false,
      homeBase: input.homeBase ?? false,
      cityStop: input.cityStop ?? false,
      vehicle: input.vehicle ?? DEFAULT_VEHICLE,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      journeyLatLongTuples: [],
    })
    .returning()
    .get();

  return toResponse(row);
}

export async function updateStop(
  id: string,
  input: UpdateStopInput
): Promise<StopInfoResponse | null> {
  const existing = db.select().from(stops).where(eq(stops.id, id)).get();
  if (!existing) return null;

  const patch: Partial<typeof stops.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (input.name !== undefined) {
    patch.name = input.name;
    if (input.name !== existing.name) patch.slug = uniqueSlug(input.name, id);
  }
  if (input.description !== undefined) patch.description = input.description;
  if (input.latLongTuple !== undefined) {
    patch.latitude = input.latLongTuple[0];
    patch.longitude = input.latLongTuple[1];
  }
  if (input.link !== undefined) patch.link = input.link;
  if (input.statePark !== undefined) patch.statePark = input.statePark;
  if (input.nationalMonument !== undefined) patch.nationalMonument = input.nationalMonument;
  if (input.nationalPark !== undefined) patch.nationalPark = input.nationalPark;
  if (input.armyCorps !== undefined) patch.armyCorps = input.armyCorps;
  if (input.overnightStop !== undefined) patch.overnightStop = input.overnightStop;
  if (input.homeBase !== undefined) patch.homeBase = input.homeBase;
  if (input.cityStop !== undefined) patch.cityStop = input.cityStop;
  if (input.vehicle !== undefined) patch.vehicle = input.vehicle;
  if (input.arrivalDate !== undefined) patch.arrivalDate = input.arrivalDate;
  if (input.departureDate !== undefined) patch.departureDate = input.departureDate;
  if (input.journeyLatLongTuples !== undefined) patch.journeyLatLongTuples = input.journeyLatLongTuples;
  if (input.coverPhotoId !== undefined) patch.coverPhotoId = input.coverPhotoId;

  const row = db.update(stops).set(patch).where(eq(stops.id, id)).returning().get();
  return row ? toResponse(row) : null;
}

export async function deleteStop(id: string): Promise<boolean> {
  const result = db.delete(stops).where(eq(stops.id, id)).run();
  return result.changes > 0;
}

/** Set the vehicle on every stop whose arrival falls in [from, to] (ISO dates). Returns count. */
export async function setVehicleForRange(vehicle: VehicleKey, from: string, to: string): Promise<number> {
  const rows = db.select({ id: stops.id, arrivalDate: stops.arrivalDate }).from(stops).all();
  const ids = rows.filter((r) => r.arrivalDate.slice(0, 10) >= from.slice(0, 10) && r.arrivalDate.slice(0, 10) <= to.slice(0, 10)).map((r) => r.id);
  const now = new Date().toISOString();
  db.transaction((tx) => {
    for (const id of ids) tx.update(stops).set({ vehicle, updatedAt: now }).where(eq(stops.id, id)).run();
  });
  return ids.length;
}
