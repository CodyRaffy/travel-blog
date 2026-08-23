import fs from "fs";
import path from "path";
import sharp from "sharp";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PhotoRow, PhotoVariants } from "@/lib/db/schema";
import { MEDIA_DIR } from "@/lib/media";
import { absolutePhotoPath } from "@/lib/import/photoScan";
import { EXIFTOOL } from "@/lib/import/config";
import { execFile } from "child_process";
import { promisify } from "util";
import type { PhotoResponse, CurationStatus } from "@/models/Photo";

const execFileP = promisify(execFile);
const { photos, stops } = schema;

export function toPhotoResponse(row: PhotoRow): PhotoResponse {
  return {
    id: row.id,
    path: row.dropboxPath,
    fileName: row.fileName,
    takenAt: row.takenAt,
    latitude: row.latitude,
    longitude: row.longitude,
    width: row.width,
    height: row.height,
    stopId: row.stopId,
    curationStatus: row.curationStatus as CurationStatus,
    score: row.score,
    sortOrder: row.sortOrder,
    caption: row.caption,
    variants: row.variants ?? null,
    isVideo: /\.(mov|mp4|m4v)$/i.test(row.fileName),
  };
}

// ---- listing -----------------------------------------------------------------

export async function listStopPhotos(stopId: string, status?: CurationStatus): Promise<PhotoResponse[]> {
  const conds = [eq(photos.stopId, stopId)];
  if (status) conds.push(eq(photos.curationStatus, status));
  const rows = db
    .select()
    .from(photos)
    .where(and(...conds))
    .orderBy(asc(photos.sortOrder), asc(photos.takenAt))
    .all();
  return rows.map(toPhotoResponse);
}

export async function stopPhotoCounts(stopId: string): Promise<Record<CurationStatus, number>> {
  const counts = { unreviewed: 0, suggested: 0, kept: 0, skipped: 0 };
  for (const r of db
    .select({ s: photos.curationStatus, n: sql<number>`count(*)` })
    .from(photos)
    .where(eq(photos.stopId, stopId))
    .groupBy(photos.curationStatus)
    .all())
    counts[r.s as CurationStatus] = r.n;
  return counts;
}

/** Kept photos with web variants, in display order: what the public site shows. */
export async function getStopGallery(stopId: string): Promise<PhotoResponse[]> {
  return (await listStopPhotos(stopId, "kept")).filter((p) => p.variants);
}

// ---- suggestion ----------------------------------------------------------------

/**
 * Pick ~`target` photos for a stop: spread across the stay, GPS-tagged, not
 * part of a burst (several shots within 2 minutes), preferring larger images and
 * skipping screenshots/videos. Only touches photos still `unreviewed`/`suggested`;
 * your kept/skipped decisions stand.
 */
export async function suggestStopPhotos(stopId: string, target = 8): Promise<number> {
  const all = db
    .select()
    .from(photos)
    .where(and(eq(photos.stopId, stopId), inArray(photos.curationStatus, ["unreviewed", "suggested"])))
    .orderBy(asc(photos.takenAt))
    .all();
  if (all.length === 0) return 0;

  const keptCount = db
    .select({ n: sql<number>`count(*)` })
    .from(photos)
    .where(and(eq(photos.stopId, stopId), eq(photos.curationStatus, "kept")))
    .get()?.n ?? 0;
  const want = Math.max(0, target - keptCount);

  // Score every candidate.
  const scored = all.map((p, i) => {
    let score = 0;
    if (p.latitude != null) score += 3;
    const px = (p.width ?? 0) * (p.height ?? 0);
    if (px >= 8_000_000) score += 2;
    else if (px >= 2_000_000) score += 1;
    if (/\.(png)$/i.test(p.fileName)) score -= 4; // screenshots
    if (/\.(mov|mp4|m4v)$/i.test(p.fileName)) score -= 3;
    if (p.width && p.height && p.width > p.height) score += 0.5; // landscape frames galleries better
    // burst: a neighbour within 2 minutes
    const t = p.takenAt ? Date.parse(p.takenAt + "Z") : 0;
    const prev = all[i - 1]?.takenAt ? Date.parse(all[i - 1].takenAt! + "Z") : -Infinity;
    if (t - prev < 2 * 60_000) score -= 1.5;
    return { p, score };
  });

  // Spread across the stay: split chronologically into `want` buckets, best per bucket.
  const chosen = new Set<string>();
  if (want > 0) {
    const buckets = Math.min(want, scored.length);
    const size = scored.length / buckets;
    for (let b = 0; b < buckets; b++) {
      const slice = scored.slice(Math.floor(b * size), Math.floor((b + 1) * size));
      const best = slice.reduce((a, c) => (c.score > a.score ? c : a), slice[0]);
      if (best) chosen.add(best.p.id);
    }
  }

  const now = new Date().toISOString();
  db.transaction((tx) => {
    for (const { p, score } of scored) {
      tx.update(photos)
        .set({ score, curationStatus: chosen.has(p.id) ? "suggested" : "unreviewed", updatedAt: now })
        .where(eq(photos.id, p.id))
        .run();
    }
  });
  return chosen.size;
}

// ---- curation --------------------------------------------------------------------

export async function setCuration(
  id: string,
  patch: { curationStatus?: CurationStatus; caption?: string | null; sortOrder?: number }
): Promise<PhotoResponse | null> {
  const existing = db.select().from(photos).where(eq(photos.id, id)).get();
  if (!existing) return null;

  const set: Partial<typeof photos.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (patch.caption !== undefined) set.caption = patch.caption;
  if (patch.sortOrder !== undefined) set.sortOrder = patch.sortOrder;

  if (patch.curationStatus && patch.curationStatus !== existing.curationStatus) {
    set.curationStatus = patch.curationStatus;
    if (patch.curationStatus === "kept") {
      set.variants = await generateVariants(existing);
      if (existing.sortOrder == null) {
        const max = db
          .select({ m: sql<number>`coalesce(max(sort_order), -1)` })
          .from(photos)
          .where(and(eq(photos.stopId, existing.stopId ?? ""), eq(photos.curationStatus, "kept")))
          .get()?.m ?? -1;
        set.sortOrder = max + 1;
      }
    } else if (existing.variants) {
      removeVariants(existing.id);
      set.variants = null;
      // If this was the stop's cover, clear it.
      if (existing.stopId) {
        db.update(stops)
          .set({ coverPhotoId: null })
          .where(and(eq(stops.id, existing.stopId), eq(stops.coverPhotoId, existing.id)))
          .run();
      }
    }
  }

  const row = db.update(photos).set(set).where(eq(photos.id, id)).returning().get();
  return row ? toPhotoResponse(row) : null;
}

export async function reorderStopPhotos(stopId: string, orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    orderedIds.forEach((id, i) => {
      tx.update(photos)
        .set({ sortOrder: i, updatedAt: now })
        .where(and(eq(photos.id, id), eq(photos.stopId, stopId)))
        .run();
    });
  });
}

// ---- web variants ----------------------------------------------------------------

const VARIANT_SIZES: Record<keyof PhotoVariants, number> = { thumb: 480, medium: 1400, large: 2400 };
const VIDEO_EXT = /\.(mov|mp4|m4v)$/i;
const HEIF_EXT = /\.(heic|heif)$/i;

/** Resize the original into WebP variants under MEDIA_DIR/photos/<id>/. Originals stay in Dropbox. */
export async function generateVariants(photo: PhotoRow): Promise<PhotoVariants> {
  const src = absolutePhotoPath(photo.dropboxPath);
  if (!fs.existsSync(src)) throw new Error(`Original not found: ${src}`);

  let input: Buffer | string = src;
  if (VIDEO_EXT.test(photo.fileName) || HEIF_EXT.test(photo.fileName)) {
    const preview = await embeddedPreview(src);
    if (!preview) throw new Error(`No embedded preview to render for ${photo.fileName}`);
    input = preview;
  }

  const dir = path.join(MEDIA_DIR, "photos", photo.id);
  fs.mkdirSync(dir, { recursive: true });
  const out = {} as PhotoVariants;
  for (const [name, size] of Object.entries(VARIANT_SIZES) as [keyof PhotoVariants, number][]) {
    const file = path.join(dir, `${name}.webp`);
    await sharp(input, { failOn: "none" })
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: name === "thumb" ? 78 : 84 })
      .toFile(file);
    out[name] = `photos/${photo.id}/${name}.webp`;
  }
  return out;
}

function removeVariants(photoId: string) {
  fs.rmSync(path.join(MEDIA_DIR, "photos", photoId), { recursive: true, force: true });
}

async function embeddedPreview(file: string): Promise<Buffer | null> {
  for (const tag of ["-PreviewImage", "-ThumbnailImage", "-CoverArt"]) {
    try {
      const { stdout } = await execFileP(EXIFTOOL, ["-b", tag, file], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
      if (stdout.length > 0) return stdout;
    } catch {
      /* next */
    }
  }
  return null;
}
