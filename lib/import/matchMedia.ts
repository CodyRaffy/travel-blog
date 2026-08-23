/**
 * Match Facebook post media (recompressed copies) to the full-quality originals
 * in the Dropbox library by perceptual hash, so the site can show the originals.
 */
import fs from "fs";
import path from "path";
import { and, eq, gte, lte, isNotNull, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PostMedia } from "@/lib/db/schema";
import { dHash, hammingDistance } from "@/lib/phash";
import { MEDIA_DIR } from "@/lib/media";
import { generateVariants } from "@/lib/photos";

const { photos, posts, postCandidates } = schema;

/** Max differing bits to call two images the same picture (recompressed copies score 0–6). */
const MAX_DISTANCE = 8;
/** A second-best candidate must be at least this much worse, or the match is ambiguous (bursts). */
const MIN_MARGIN = 3;
/** Looser acceptance for edited copies, requiring a much bigger gap to the runner-up. */
const LOOSE_DISTANCE = 12;
const LOOSE_MARGIN = 6;
/** Originals are taken before the post goes up; allow long write-ups and a little clock skew. */
const WINDOW_BEFORE_DAYS = 120;
const WINDOW_AFTER_DAYS = 2;

export interface MatchStats {
  items: number;
  hashed: number;
  matched: number;
  alreadyMatched: number;
  unmatched: number;
}

type Row = { id: string; postedAt: string; media: PostMedia[] };

function candidateOriginals(postedAt: string) {
  const t = new Date(postedAt).getTime();
  const from = new Date(t - WINDOW_BEFORE_DAYS * 86400000).toISOString().slice(0, 19);
  const to = new Date(t + WINDOW_AFTER_DAYS * 86400000).toISOString().slice(0, 19);
  return db
    .select({ id: photos.id, phash: photos.phash })
    .from(photos)
    .where(and(isNotNull(photos.phash), ne(photos.phash, ""), gte(photos.takenAt, from), lte(photos.takenAt, to)))
    .all() as { id: string; phash: string }[];
}

async function matchRow(row: Row, stats: MatchStats, onProgress?: (m: string) => void): Promise<PostMedia[] | null> {
  let changed = false;
  const media = [...row.media];
  let pool: { id: string; phash: string }[] | null = null;

  for (let i = 0; i < media.length; i++) {
    const m = media[i];
    stats.items++;
    if (m.kind !== "photo") continue;
    if (m.photoId) {
      stats.alreadyMatched++;
      continue;
    }
    if (!m.phash) {
      const file = path.join(MEDIA_DIR, m.path);
      if (!fs.existsSync(file)) continue;
      try {
        m.phash = await dHash(file);
        stats.hashed++;
        changed = true;
      } catch {
        continue;
      }
    }
    pool ??= candidateOriginals(row.postedAt);
    let best: { id: string; d: number } | null = null;
    let second = Infinity;
    for (const p of pool) {
      const d = hammingDistance(m.phash, p.phash);
      if (!best || d < best.d) {
        if (best) second = best.d;
        best = { id: p.id, d };
      } else if (d < second) second = d;
    }
    const margin = second === Infinity ? Infinity : second - best!.d;
    const accept =
      !!best &&
      ((best.d <= MAX_DISTANCE && margin >= MIN_MARGIN) ||
        // edited/cropped copies land a little further away; accept only when nothing else is close
        (best.d <= LOOSE_DISTANCE && margin >= LOOSE_MARGIN));
    if (best && accept) {
      media[i] = { ...m, photoId: best.id };
      stats.matched++;
      changed = true;
    } else {
      stats.unmatched++;
    }
  }
  if (changed) onProgress?.(`${row.postedAt.slice(0, 10)}: ${media.filter((m) => m.photoId).length}/${media.length} media matched`);
  return changed ? media : null;
}

/** Match media on every staged candidate and every imported post. Idempotent. */
export async function matchAllFacebookMedia(onProgress?: (m: string) => void): Promise<MatchStats> {
  const stats: MatchStats = { items: 0, hashed: 0, matched: 0, alreadyMatched: 0, unmatched: 0 };

  const cands = db.select({ id: postCandidates.id, postedAt: postCandidates.postedAt, media: postCandidates.media }).from(postCandidates).all();
  for (const c of cands) {
    const media = await matchRow(c, stats, onProgress);
    if (media) db.update(postCandidates).set({ media }).where(eq(postCandidates.id, c.id)).run();
  }
  const ps = db.select({ id: posts.id, postedAt: posts.postedAt, media: posts.media }).from(posts).where(eq(posts.source, "facebook")).all();
  for (const p of ps) {
    const media = await matchRow(p, stats, onProgress);
    if (media) db.update(posts).set({ media }).where(eq(posts.id, p.id)).run();
  }
  return stats;
}

/** Make sure every matched original referenced by `media` has web variants rendered. */
export async function ensureVariantsForMedia(media: PostMedia[]): Promise<number> {
  let rendered = 0;
  for (const m of media) {
    if (!m.photoId) continue;
    const p = db.select().from(photos).where(eq(photos.id, m.photoId)).get();
    if (!p || p.variants) continue;
    try {
      const variants = await generateVariants(p);
      db.update(photos).set({ variants, updatedAt: new Date().toISOString() }).where(eq(photos.id, p.id)).run();
      rendered++;
    } catch (err) {
      console.error(`variant render failed for ${p.dropboxPath}:`, err);
    }
  }
  return rendered;
}
