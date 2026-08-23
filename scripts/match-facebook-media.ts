/**
 * Link Facebook post photos to their full-quality originals in the Dropbox
 * library (by perceptual hash), on staged candidates and imported posts.
 * Run `photos:hash` first. Safe to re-run.
 *
 *   npm run posts:match-media            npm run prod -- posts:match-media
 */
import { matchAllFacebookMedia, ensureVariantsForMedia } from "../lib/import/matchMedia";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

async function main() {
  const stats = await matchAllFacebookMedia((m) => console.log("  " + m));
  console.log(`\n${stats.matched} newly matched, ${stats.alreadyMatched} already matched, ${stats.unmatched} no original found (of ${stats.items} media items)`);
  if (process.argv.includes("--render")) {
    let n = 0;
    for (const p of db.select({ media: schema.posts.media }).from(schema.posts).where(eq(schema.posts.source, "facebook")).all()) {
      n += await ensureVariantsForMedia(p.media);
    }
    console.log(`Rendered web variants for ${n} originals used by approved posts.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
