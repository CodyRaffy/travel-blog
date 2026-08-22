import path from "path";

/**
 * Root directory for media files served by /api/media/*.
 * Override with MEDIA_DIR (Docker will point it at a volume).
 *
 * Layout:
 *   facebook/<original export path>   - copied out of the Facebook export
 *   photos/<id>/{thumb,medium,large}.webp - curated Dropbox photo variants (Phase 3)
 */
export const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), "data", "media");

/** Resolve a media-relative path to disk, refusing anything that escapes MEDIA_DIR. */
export function resolveMediaPath(relative: string): string | null {
  const normalized = relative.replace(/\\/g, "/").replace(/^\/+/, "");
  const full = path.resolve(MEDIA_DIR, normalized);
  const root = path.resolve(MEDIA_DIR) + path.sep;
  if (!full.startsWith(root)) return null;
  return full;
}

/** Public URL for a media-relative path. */
export function mediaUrl(relative: string): string {
  return "/api/media/" + relative.split("/").map(encodeURIComponent).join("/");
}

export const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
};
