import type { PostMedia, PostPlace } from "@/lib/db/schema";

export type { PostMedia, PostPlace };

export type PostSource = "facebook" | "manual";
export type PostCandidateStatus = "pending" | "approved" | "rejected";

/** Post media with resolved public URLs. `upgraded` = showing the Dropbox original. */
export interface PostMediaView extends PostMedia {
  urls: { thumb: string; medium: string; large: string };
  upgraded: boolean;
}

export interface PostResponse {
  id: string;
  stopId: string | null;
  title: string | null;
  body: string;
  postedAt: string;
  source: PostSource;
  sourceId: string | null;
  media: PostMediaView[];
  published: boolean;
}

export interface CreatePostInput {
  stopId?: string | null;
  title?: string | null;
  body: string;
  postedAt?: string;
  source?: PostSource;
  sourceId?: string | null;
  media?: PostMedia[];
  published?: boolean;
}

export interface UpdatePostInput {
  stopId?: string | null;
  title?: string | null;
  body?: string;
  postedAt?: string;
  media?: PostMedia[];
  published?: boolean;
}

export interface PostCandidateResponse {
  id: string;
  sourceId: string;
  body: string;
  postedAt: string;
  media: PostMedia[];
  place: PostPlace | null;
  suggestedStopId: string | null;
  status: PostCandidateStatus;
  postId: string | null;
}
