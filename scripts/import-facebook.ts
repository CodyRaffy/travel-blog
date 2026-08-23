/**
 * Stage posts from an extracted Facebook "Download your information" export.
 *
 *   npm run import:facebook -- <path-to-extracted-export> [--dry-run]
 *
 * - Parses every your_posts*.json, fixing Facebook's broken UTF-8.
 * - Copies attached photos/videos into MEDIA_DIR/facebook/... (skips files already copied).
 * - Inserts each post into post_candidates with a suggested stop (by date).
 *   Nothing reaches the live `posts` table until approved at /admin/posts/review.
 *
 * Re-running is safe: candidates already staged are skipped.
 */
import fs from "fs";
import path from "path";
import { parseFacebookExport } from "../lib/import/facebook";
import { stagePostCandidates, relinkPendingCandidates } from "../lib/posts";
import { MEDIA_DIR } from "../lib/media";
import type { PostMedia } from "../lib/db/schema";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const exportDir = args.find((a) => !a.startsWith("--"));

if (!exportDir) {
  console.error("Usage: npm run import:facebook -- <export-dir> [--dry-run]");
  process.exit(1);
}
if (!fs.existsSync(exportDir)) {
  console.error(`Export directory not found: ${exportDir}`);
  process.exit(1);
}

async function main() {
  const posts = parseFacebookExport(exportDir!);
  const withMedia = posts.filter((p) => p.media.length > 0).length;
  const mediaCount = posts.reduce((n, p) => n + p.media.length, 0);
  console.log(
    `Parsed ${posts.length} posts (${withMedia} with media, ${mediaCount} media files) ` +
      `spanning ${posts[0]?.postedAt.slice(0, 10)} → ${posts.at(-1)?.postedAt.slice(0, 10)}`
  );

  if (dryRun) {
    for (const p of posts.slice(0, 5)) {
      console.log(`\n[${p.postedAt}] ${p.media.length} media`);
      console.log(p.text.slice(0, 200).replace(/\n/g, " ") || "(no text)");
    }
    console.log("\nDry run — nothing written.");
    return;
  }

  let copied = 0;
  let missing = 0;
  const staged = posts.map((p) => {
    const media: PostMedia[] = [];
    for (const m of p.media) {
      const src = path.join(exportDir!, m.uri);
      const rel = "facebook/" + m.uri.replace(/\\/g, "/").replace(/^\/+/, "");
      const dest = path.join(MEDIA_DIR, rel);
      if (!fs.existsSync(src)) {
        missing++;
        continue;
      }
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        copied++;
      }
      media.push({ kind: m.kind, path: rel, description: m.description });
    }
    return { sourceId: p.sourceId, body: p.text, postedAt: p.postedAt, media, place: p.place ?? null };
  });

  const inserted = await stagePostCandidates(staged);
  const relinked = await relinkPendingCandidates();

  console.log(`Copied ${copied} media files to ${MEDIA_DIR}${missing ? ` (${missing} referenced files missing from export)` : ""}`);
  console.log(`Staged ${inserted} new post candidates (${posts.length - inserted} already staged)`);
  if (relinked) console.log(`Updated stop suggestions on ${relinked} pending candidates`);
  console.log("Review them at http://localhost:3000/admin/posts/review");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
