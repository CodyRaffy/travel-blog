/**
 * One-time migration: load data/stops.json into the SQLite database.
 *
 *   npm run db:import-json [path/to/stops.json]
 *
 * Idempotent: stops whose id already exists are skipped.
 */
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db, schema, DB_PATH } from "../lib/db";
import { slugify } from "../lib/slug";

interface LegacyStop {
  id: string;
  name: string;
  latLongTuple: [number, number];
  link: string;
  statePark: boolean;
  nationalMonument: boolean;
  nationalPark: boolean;
  arrivalDate: string;
  departureDate: string;
  journeyLatLongTuples: [number, number][];
}

const file = process.argv[2] ?? path.join(process.cwd(), "data", "stops.json");
const legacy: LegacyStop[] = JSON.parse(fs.readFileSync(file, "utf-8"));

const usedSlugs = new Set(db.select({ slug: schema.stops.slug }).from(schema.stops).all().map((s) => s.slug));
let inserted = 0;
let skipped = 0;

for (const s of legacy) {
  const exists = db.select({ id: schema.stops.id }).from(schema.stops).where(eq(schema.stops.id, s.id)).get();
  if (exists) {
    skipped++;
    continue;
  }
  let slug = slugify(s.name) || "stop";
  for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(s.name)}-${n}`;
  usedSlugs.add(slug);

  db.insert(schema.stops)
    .values({
      id: s.id,
      slug,
      name: s.name,
      latitude: s.latLongTuple[0],
      longitude: s.latLongTuple[1],
      link: s.link ?? "",
      statePark: !!s.statePark,
      nationalMonument: !!s.nationalMonument,
      nationalPark: !!s.nationalPark,
      arrivalDate: s.arrivalDate,
      departureDate: s.departureDate,
      journeyLatLongTuples: s.journeyLatLongTuples ?? [],
    })
    .run();
  inserted++;
}

console.log(`Imported ${inserted} stop(s), skipped ${skipped} existing, from ${file} into ${DB_PATH}`);
