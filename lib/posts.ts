import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PostRow, PostCandidateRow, PostMedia, StopRow } from "@/lib/db/schema";
import type {
  PostResponse,
  PostCandidateResponse,
  CreatePostInput,
  UpdatePostInput,
} from "@/models/Post";

const { posts, postCandidates, stops } = schema;

// ---- mapping ---------------------------------------------------------------

function toPost(row: PostRow): PostResponse {
  return {
    id: row.id,
    stopId: row.stopId,
    title: row.title,
    body: row.body,
    postedAt: row.postedAt,
    source: row.source as PostResponse["source"],
    sourceId: row.sourceId,
    media: row.media,
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
    suggestedStopId: row.suggestedStopId,
    status: row.status as PostCandidateResponse["status"],
    postId: row.postId,
  };
}

// ---- stop linking ----------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pick the stop whose stay contains `date`. The departure day counts in full
 * (people post about a place the day they leave it). Returns null when no stop
 * contains the date — those land in the review queue as ambiguous.
 */
export function suggestStopForDate(
  date: string,
  stopList: Pick<StopRow, "id" | "arrivalDate" | "departureDate">[]
): string | null {
  const t = new Date(date).getTime();
  let best: { id: string; span: number } | null = null;
  for (const s of stopList) {
    const start = new Date(s.arrivalDate).getTime();
    const end = new Date(s.departureDate).getTime() + DAY_MS;
    if (t >= start && t < end) {
      const span = end - start;
      if (!best || span < best.span) best = { id: s.id, span }; // prefer the tighter range
    }
  }
  return best?.id ?? null;
}

function allStopsForLinking() {
  return db
    .select({ id: stops.id, arrivalDate: stops.arrivalDate, departureDate: stops.departureDate })
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
          suggestedStopId: suggestStopForDate(c.postedAt, stopList),
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
      const suggestion = suggestStopForDate(c.postedAt, stopList);
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
