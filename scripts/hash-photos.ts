/**
 * Compute a perceptual hash for every trip photo that doesn't have one yet
 * (needed to match Facebook copies back to the Dropbox originals).
 *
 *   npm run photos:hash            (dev DB)     npm run prod -- photos:hash   (live DB)
 *
 * Resumable: re-running only hashes photos still missing a hash. ~40-60 minutes
 * for the full library the first time; videos are skipped.
 */
import { eq, isNull } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { dHash } from "../lib/phash";
import { absolutePhotoPath } from "../lib/import/photoScan";

const { photos } = schema;
const CONCURRENCY = 4;

async function main() {
  const todo = db
    .select({ id: photos.id, path: photos.dropboxPath })
    .from(photos)
    .where(isNull(photos.phash))
    .all()
    .filter((p) => !/\.(mov|mp4|m4v)$/i.test(p.path));
  console.log(`${todo.length} photos to hash`);
  const started = Date.now();
  let done = 0;
  let failed = 0;
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const p = todo[i++];
      try {
        const h = await dHash(absolutePhotoPath(p.path));
        db.update(photos).set({ phash: h }).where(eq(photos.id, p.id)).run();
      } catch {
        failed++;
        db.update(photos).set({ phash: "" }).where(eq(photos.id, p.id)).run(); // don't retry forever
      }
      done++;
      if (done % 1000 === 0) {
        const rate = done / ((Date.now() - started) / 1000);
        console.log(`  ${done}/${todo.length} (${rate.toFixed(0)}/s, ~${Math.round((todo.length - done) / rate / 60)} min left)`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done: ${done} hashed (${failed} unreadable) in ${Math.round((Date.now() - started) / 60000)} min`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
