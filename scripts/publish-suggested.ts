/**
 * Backfill: for every stop with no kept photos, suggest ~8 and keep them, then
 * render their web variants so galleries and covers appear immediately.
 *
 *   npm run prod -- photos:publish-suggested
 */
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { suggestStopPhotos, keepSuggestedPhotos, getStopGallery } from "../lib/photos";

const { stops, photos } = schema;

async function main() {
  const all = db.select({ id: stops.id, name: stops.name }).from(stops).orderBy(stops.arrivalDate).all();
  let published = 0;
  for (const [i, s] of all.entries()) {
    const kept = db
      .select({ n: sql<number>`count(*)` })
      .from(photos)
      .where(and(eq(photos.stopId, s.id), eq(photos.curationStatus, "kept")))
      .get()!.n;
    if (kept > 0) {
      await getStopGallery(s.id); // render any missing variants for already-kept photos
      continue;
    }
    await suggestStopPhotos(s.id);
    const n = await keepSuggestedPhotos(s.id);
    await getStopGallery(s.id); // render variants now so covers/popups work without a page visit
    if (n > 0) published++;
    console.log(`${i + 1}/${all.length} ${s.name}: published ${n}`);
  }
  const withVariants = db.select({ n: sql<number>`count(*)` }).from(photos).where(isNotNull(photos.variants)).get()!.n;
  console.log(`\nDone: galleries published for ${published} stops; ${withVariants} photos have web variants.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
