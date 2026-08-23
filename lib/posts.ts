import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PostRow, PostCandidateRow, PostMedia, PostPlace, StopRow } from "@/lib/db/schema";
import { mediaUrl } from "@/lib/media";
import { ensureVariantsForMedia } from "@/lib/import/matchMedia";
import type {
  PostResponse,
  PostCandidateResponse,
  CreatePostInput,
  UpdatePostInput,
} from "@/models/Post";

const { posts, postCandidates, stops, photos } = schema;

// ---- mapping ---------------------------------------------------------------

/** Attach public URLs: the matched Dropbox original's web variants when rendered, else the Facebook copy. */
function resolveMedia(media: PostMedia[]): PostResponse["media"] {
  return media.map((m) => {
    const fb = mediaUrl(m.path);
    if (m.kind === "photo" && m.photoId) {
      const p = db.select({ v: photos.variants }).from(photos).where(eq(photos.id, m.photoId)).get();
      if (p?.v) return { ...m, urls: { thumb: mediaUrl(p.v.thumb), medium: mediaUrl(p.v.medium), large: mediaUrl(p.v.large) }, upgraded: true };
    }
    return { ...m, urls: { thumb: fb, medium: fb, large: fb }, upgraded: false };
  });
}

function toPost(row: PostRow): PostResponse {
  return {
    id: row.id,
    stopId: row.stopId,
    title: row.title,
    body: row.body,
    postedAt: row.postedAt,
    source: row.source as PostResponse["source"],
    sourceId: row.sourceId,
    media: resolveMedia(row.media),
    published: row.published,
  };
}

function toCandidate(row: PostCandidateRow): PostCandidateResponse {
  return {
    id: row.id,
    sourceId: row.sourceId,
    body: row.body,
    postedAt: row.postedAt,
    media: row.media,
    place: row.place ?? null,
    suggestedStopId: row.suggestedStopId,
    status: row.status as PostCandidateResponse["status"],
    postId: row.postId,
  };
}

// ---- stop linking ----------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

type StopForLinking = Pick<StopRow, "id" | "arrivalDate" | "departureDate" | "latitude" | "longitude">;

const haversineKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x = Math.sin(toRad(bLat - aLat) / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(toRad(bLon - aLon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
};

/** Days a post may trail the stay it's about (people write up a place after leaving). */
const LATE_POST_DAYS = 14;

/**
 * Pick the stop a post is about.
 *  1. The stop whose stay contains the post date (departure day inclusive; tightest wins).
 *  2. Else, if the post has a check-in location: the nearest stop within 30 km whose
 *     stay is within 30 days of the post.
 *  3. Else the most recent stop that ended within LATE_POST_DAYS before the post.
 * Null means ambiguous: it lands in the review queue unassigned.
 */
export function suggestStopForDate(date: string, stopList: StopForLinking[], place?: PostPlace | null): string | null {
  const t = new Date(date).getTime();
  let best: { id: string; span: number } | null = null;
  for (const s of stopList) {
    const start = new Date(s.arrivalDate).getTime();
    const end = new Date(s.departureDate).getTime() + DAY_MS;
    if (t >= start && t < end) {
      const span = end - start;
      if (!best || span < best.span) best = { id: s.id, span };
    }
  }
  if (best) return best.id;

  if (place?.latitude != null && place.longitude != null) {
    let near: { id: string; d: number } | null = null;
    for (const s of stopList) {
      const start = new Date(s.arrivalDate).getTime();
      const end = new Date(s.departureDate).getTime() + DAY_MS;
      if (t < start - 30 * DAY_MS || t > end + 30 * DAY_MS) continue;
      const d = haversineKm(place.latitude, place.longitude, s.latitude, s.longitude);
      if (d <= 30 && (!near || d < near.d)) near = { id: s.id, d };
    }
    if (near) return near.id;
  }

  let recent: { id: string; end: number } | null = null;
  for (const s of stopList) {
    const end = new Date(s.departureDate).getTime() + DAY_MS;
    if (end <= t && t - end <= LATE_POST_DAYS * DAY_MS && (!recent || end > recent.end)) recent = { id: s.id, end };
  }
  return recent?.id ?? null;
}

function allStopsForLinking(): StopForLinking[] {
  return db
    .select({ id: stops.id, arrivalDate: stops.arrivalDate, departureDate: stops.departureDate, latitude: stops.latitude, longitude: stops.longitude })
    .from(stops)
    .all();
}

// ---- posts -----------------------------------------------------------------

export async function getPosts(opts: { stopId?: string; publishedOnly?: boolean } = {}): Promise<PostResponse[]> {
  const conds = [];
  if (opts.stopId) conds.push(eq(posts.stopId, opts.stopId));
  if (opts.publishedOnly) conds.push(eq(posts.published, true));
  const q = db.select().from(posts);
  const rows = (conds.length ? q.where(and(...conds)) : q).orderBy(desc(posts.postedAt)).all();
  return rows.map(toPost);
}

export async function getPostById(id: string): Promise<PostResponse | null> {
  const row = db.select().from(posts).where(eq(posts.id, id)).get();
  return row ? toPost(row) : null;
}

export async function createPost(input: CreatePostInput): Promise<PostResponse> {
  const row = db
    .insert(posts)
    .values({
      id: crypto.randomUUID(),
      stopId: input.stopId ?? null,
      title: input.title ?? null,
      body: input.body,
      postedAt: input.postedAt ?? new Date().toISOString(),
      source: input.source ?? "manual",
      sourceId: input.sourceId ?? null,
      media: input.media ?? [],
      published: input.published ?? true,
    })
    .returning()
    .get();
  return toPost(row);
}

export async function updatePost(id: string, input: UpdatePostInput): Promise<PostResponse | null> {
  const patch: Partial<typeof posts.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (input.stopId !== undefined) patch.stopId = input.stopId;
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.postedAt !== undefined) patch.postedAt = input.postedAt;
  if (input.media !== undefined) patch.media = input.media;
  if (input.published !== undefined) patch.published = input.published;
  const row = db.update(posts).set(patch).where(eq(posts.id, id)).returning().get();
  return row ? toPost(row) : null;
}

export async function deletePost(id: string): Promise<boolean> {
  return db.delete(posts).where(eq(posts.id, id)).run().changes > 0;
}

// ---- candidates (import staging) ------------------------------------------

export interface StageCandidateInput {
  sourceId: string;
  body: string;
  postedAt: string;
  media: PostMedia[];
  place?: PostPlace | null;
}

/** Insert new candidates; existing sourceIds are left untouched. Returns count inserted. */
export async function stagePostCandidates(inputs: StageCandidateInput[]): Promise<number> {
  const stopList = allStopsForLinking();
  let inserted = 0;
  db.transaction((tx) => {
    for (const c of inputs) {
      const result = tx
        .insert(postCandidates)
        .values({
          id: crypto.randomUUID(),
          sourceId: c.sourceId,
          body: c.body,
          postedAt: c.postedAt,
          media: c.media,
          place: c.place ?? null,
          suggestedStopId: suggestStopForDate(c.postedAt, stopList, c.place),
          status: "pending",
        })
        .onConflictDoNothing({ target: postCandidates.sourceId })
        .run();
      inserted += result.changes;
    }
  });
  return inserted;
}

/** Re-run date matching for every pending candidate (e.g. after stops were added). */
export async function relinkPendingCandidates(): Promise<number> {
  const stopList = allStopsForLinking();
  const pending = db.select().from(postCandidates).where(eq(postCandidates.status, "pending")).all();
  let changed = 0;
  db.transaction((tx) => {
    for (const c of pending) {
      const suggestion = suggestStopForDate(c.postedAt, stopList, c.place);
      if (suggestion !== c.suggestedStopId) {
        tx.update(postCandidates)
          .set({ suggestedStopId: suggestion, updatedAt: new Date().toISOString() })
          .where(eq(postCandidates.id, c.id))
          .run();
        changed++;
      }
    }
  });
  return changed;
}

export async function getPostCandidates(status?: PostCandidateResponse["status"]): Promise<PostCandidateResponse[]> {
  const q = db.select().from(postCandidates);
  const rows = (status ? q.where(eq(postCandidates.status, status)) : q)
    .orderBy(asc(postCandidates.postedAt))
    .all();
  return rows.map(toCandidate);
}

export async function getPostCandidateById(id: string): Promise<PostCandidateResponse | null> {
  const row = db.select().from(postCandidates).where(eq(postCandidates.id, id)).get();
  return row ? toCandidate(row) : null;
}

export async function updatePostCandidateSuggestion(
  id: string,
  suggestedStopId: string | null
): Promise<PostCandidateResponse | null> {
  const row = db
    .update(postCandidates)
    .set({ suggestedStopId, updatedAt: new Date().toISOString() })
    .where(eq(postCandidates.id, id))
    .returning()
    .get();
  return row ? toCandidate(row) : null;
}

/** Approve: create a real post (linked to `stopId`, or the suggestion) and mark the candidate. */
export async function approvePostCandidate(
  id: string,
  stopId?: string | null
): Promise<{ candidate: PostCandidateResponse; post: PostResponse } | null> {
  const cand = db.select().from(postCandidates).where(eq(postCandidates.id, id)).get();
  if (!cand) return null;
  if (cand.status === "approved" && cand.postId) {
    const existing = db.select().from(posts).where(eq(posts.id, cand.postId)).get();
    if (existing) return { candidate: toCandidate(cand), post: toPost(existing) };
  }

  const finalStopId = stopId === undefined ? cand.suggestedStopId : stopId;
  // Show the full-quality originals for any media matched to the Dropbox library.
  await ensureVariantsForMedia(cand.media);
  const result = db.transaction((tx) => {
    const post = tx
      .insert(posts)
      .values({
        id: crypto.randomUUID(),
        stopId: finalStopId,
        title: null,
        body: cand.body,
        postedAt: cand.postedAt,
        source: "facebook",
        sourceId: cand.sourceId,
        media: cand.media,
        published: true,
      })
      .onConflictDoUpdate({
        target: [posts.source, posts.sourceId],
        set: { stopId: finalStopId, updatedAt: new Date().toISOString() },
      })
      .returning()
      .get();
    const updated = tx
      .update(postCandidates)
      .set({ status: "approved", postId: post.id, suggestedStopId: finalStopId, updatedAt: new Date().toISOString() })
      .where(eq(postCandidates.id, id))
      .returning()
      .get();
    return { candidate: toCandidate(updated), post: toPost(post) };
  });
  return result;
}

export async function rejectPostCandidate(id: string): Promise<PostCandidateResponse | null> {
  const row = db
    .update(postCandidates)
    .set({ status: "rejected", updatedAt: new Date().toISOString() })
    .where(eq(postCandidates.id, id))
    .returning()
    .get();
  return row ? toCandidate(row) : null;
}

/** Put a rejected/approved candidate back in the queue (does not delete an approved post). */
export async function resetPostCandidate(id: string): Promise<PostCandidateResponse | null> {
  const row = db
    .update(postCandidates)
    .set({ status: "pending", updatedAt: new Date().toISOString() })
    .where(eq(postCandidates.id, id))
    .returning()
    .get();
  return row ? toCandidate(row) : null;
}

export async function getCandidateCounts(): Promise<Record<PostCandidateResponse["status"], number>> {
  const rows = db.select({ status: postCandidates.status }).from(postCandidates).all();
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) counts[r.status as keyof typeof counts]++;
  return counts;
}
