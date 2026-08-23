/**
 * Scan the local photo library into the `photos` table.
 *
 *   npm run photos:scan [-- --force]
 *
 * Incremental: only new/changed files are passed to exiftool. First run over the
 * full library takes ~10 minutes; later runs take seconds.
 */
import { scanPhotoLibrary, photoLibraryStats } from "../lib/import/photoScan";
import { PHOTO_LIBRARY_DIR, PHOTO_ROOTS, TRIP_START, TRIP_END } from "../lib/import/config";

const force = process.argv.includes("--force");
console.log(`Library: ${PHOTO_LIBRARY_DIR}  roots: ${PHOTO_ROOTS.join(", ")}`);
console.log(`Trip range: ${TRIP_START} → ${TRIP_END}${force ? "  (forcing full rescan)" : ""}`);

const started = Date.now();
scanPhotoLibrary({ force, onProgress: (m) => console.log(`  ${m}`) })
  .then((r) => {
    const s = photoLibraryStats();
    console.log(
      `Done in ${Math.round((Date.now() - started) / 1000)}s: ${r.filesSeen} files seen, ${r.filesScanned} scanned, ${r.inRange} in range this run.`
    );
    console.log(`Library now holds ${s.total} trip photos (${s.withGps} with GPS), ${s.from?.slice(0, 10)} → ${s.to?.slice(0, 10)}.`);
    console.log("Next: npm run photos:cluster");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
