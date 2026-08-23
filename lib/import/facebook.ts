/**
 * Parser for Facebook's "Download your information" JSON export.
 *
 * Handles both export layouts seen in the wild:
 *   - posts/your_posts_1.json                                   (older)
 *   - your_facebook_activity/posts/your_posts__check_ins__photos_and_videos_1.json (newer)
 *   - this_profile's_activity_across_facebook/posts/profile_posts_1.json            (2025+, Pages)
 *
 * Facebook writes non-ASCII text as UTF-8 bytes re-encoded as Latin-1 escapes
 * ("â" for a right single quote). `fixMojibake` undoes that.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ParsedMedia {
  kind: "photo" | "video";
  /** Path inside the export archive, e.g. "your_facebook_activity/posts/media/abc.jpg" */
  uri: string;
  /** Unix seconds the media was created, when present. */
  creationTimestamp?: number;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface ParsedPost {
  /** Stable id for idempotent re-imports. */
  sourceId: string;
  /** ISO timestamp (UTC). */
  postedAt: string;
  text: string;
  title?: string;
  media: ParsedMedia[];
  place?: { name: string; latitude?: number; longitude?: number };
  externalUrl?: string;
}

// ---- encoding --------------------------------------------------------------

/** Reverse Facebook's Latin-1-escaped UTF-8. Safe on already-correct strings. */
export function fixMojibake(s: string): string {
  // Fast path: pure ASCII or strings with chars outside Latin-1 are already fine.
  let needs = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 0xff) return s;
    if (c >= 0x80) needs = true;
  }
  if (!needs) return s;
  const decoded = Buffer.from(s, "latin1").toString("utf8");
  // If decoding produced replacement chars the input wasn't mojibake; keep original.
  return decoded.includes("�") ? s : decoded;
}

function deepFix<T>(value: T): T {
  if (typeof value === "string") return fixMojibake(value) as T;
  if (Array.isArray(value)) return value.map(deepFix) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepFix(v);
    return out as T;
  }
  return value;
}

// ---- raw export shapes (loosely typed; Facebook shifts these between versions) ----

interface RawMedia {
  uri?: string;
  creation_timestamp?: number;
  description?: string;
  title?: string;
  media_metadata?: {
    photo_metadata?: { exif_data?: RawExif[] };
    video_metadata?: { exif_data?: RawExif[] };
  };
}
interface RawExif {
  latitude?: number;
  longitude?: number;
  taken_timestamp?: number;
}
interface RawAttachmentItem {
  media?: RawMedia;
  place?: { name?: string; coordinate?: { latitude?: number; longitude?: number } };
  external_context?: { url?: string; name?: string };
  text?: string;
}
interface RawPost {
  timestamp?: number;
  title?: string;
  data?: Array<{ post?: string; update_timestamp?: number }>;
  attachments?: Array<{ data?: RawAttachmentItem[] }>;
}

const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".avi", ".webm", ".3gp"]);

function shortHash(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
}

/** Parse one posts JSON document (already read from disk). Exported for tests. */
export function parsePostsJson(json: unknown): ParsedPost[] {
  const root = deepFix(json) as unknown;
  // Newer exports are a bare array; some older ones wrap it as { status_updates: [...] }.
  const items: RawPost[] = Array.isArray(root)
    ? root
    : ((root as { status_updates?: RawPost[] })?.status_updates ?? []);

  const posts: ParsedPost[] = [];
  for (const raw of items) {
    if (typeof raw.timestamp !== "number") continue;

    const text = (raw.data ?? [])
      .map((d) => d.post)
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      .join("\n\n")
      .trim();

    const media: ParsedMedia[] = [];
    let place: ParsedPost["place"];
    let externalUrl: string | undefined;
    for (const att of raw.attachments ?? []) {
      for (const item of att.data ?? []) {
        if (item.media?.uri) {
          const m = item.media;
          const uri = item.media.uri;
          const exif =
            m.media_metadata?.photo_metadata?.exif_data?.[0] ??
            m.media_metadata?.video_metadata?.exif_data?.[0];
          const ext = path.extname(uri).toLowerCase();
          media.push({
            kind: VIDEO_EXT.has(ext) ? "video" : "photo",
            uri,
            creationTimestamp: m.creation_timestamp ?? exif?.taken_timestamp,
            description: m.description?.trim() || undefined,
            latitude: exif?.latitude,
            longitude: exif?.longitude,
          });
        }
        if (item.place?.name && !place) {
          place = {
            name: item.place.name,
            latitude: item.place.coordinate?.latitude,
            longitude: item.place.coordinate?.longitude,
          };
        }
        if (item.external_context?.url && !externalUrl) externalUrl = item.external_context.url;
      }
    }

    // Album uploads often repeat the post text as every photo's description; drop those.
    for (const m of media) if (m.description && m.description === text) m.description = undefined;

    // Skip truly empty entries (e.g. "X updated their cover photo" with no media).
    if (!text && media.length === 0) continue;

    posts.push({
      sourceId: `fb:${raw.timestamp}:${shortHash(text + "|" + media.map((m) => m.uri).join(","))}`,
      postedAt: new Date(raw.timestamp * 1000).toISOString(),
      text,
      title: raw.title?.trim() || undefined,
      media,
      place,
      externalUrl,
    });
  }
  return posts;
}

/** Recursively find every posts JSON file in an extracted export directory. */
export function findPostsFiles(exportDir: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "media" || entry.name === "messages") continue; // big and irrelevant
        walk(full);
      } else if (/^(your_posts|profile_posts).*\.json$/i.test(entry.name)) {
        found.push(full);
      }
    }
  };
  walk(exportDir);
  return found.sort();
}

/** Parse every posts file in an export. Media URIs are relative to `exportDir`. */
export function parseFacebookExport(exportDir: string): ParsedPost[] {
  const files = findPostsFiles(exportDir);
  if (files.length === 0) {
    throw new Error(
      `No your_posts*.json / profile_posts*.json files found under ${exportDir}. Is this the extracted Facebook export folder?`
    );
  }
  const seen = new Set<string>();
  const posts: ParsedPost[] = [];
  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(file, "utf-8"));
    for (const p of parsePostsJson(json)) {
      if (seen.has(p.sourceId)) continue;
      seen.add(p.sourceId);
      posts.push(p);
    }
  }
  posts.sort((a, b) => a.postedAt.localeCompare(b.postedAt));
  return posts;
}
