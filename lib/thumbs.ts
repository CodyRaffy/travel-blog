import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import { absolutePhotoPath } from "@/lib/import/photoScan";
import { EXIFTOOL } from "@/lib/import/config";

const execFileP = promisify(execFile);

/** Derived images that can be regenerated at any time. Not backed up. */
export const CACHE_DIR = process.env.CACHE_DIR ?? path.join(process.cwd(), "data", "cache");

const VIDEO_EXT = new Set([".mov", ".mp4", ".m4v"]);
const HEIF_EXT = new Set([".heic", ".heif"]);

/**
 * Returns a JPEG thumbnail (longest edge `size`) for a library photo, generating
 * and caching it on first request. Videos and HEIC use the preview image the
 * camera embedded in the file (via exiftool) since sharp can't decode them.
 */
export async function getThumbnail(photoId: string, libraryPath: string, size = 320): Promise<Buffer | null> {
  const cacheFile = path.join(CACHE_DIR, "thumbs", `${photoId}-${size}.jpg`);
  if (fs.existsSync(cacheFile)) return fs.readFileSync(cacheFile);

  const src = absolutePhotoPath(libraryPath);
  if (!fs.existsSync(src)) return null;

  try {
    const ext = path.extname(src).toLowerCase();
    let input: Buffer | string = src;
    if (VIDEO_EXT.has(ext) || HEIF_EXT.has(ext)) {
      const embedded = await embeddedPreview(src);
      if (!embedded) return null;
      input = embedded;
    }
    const out = await sharp(input, { failOn: "none" })
      .rotate() // honour EXIF orientation
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, out);
    return out;
  } catch (err) {
    console.error(`thumbnail failed for ${libraryPath}:`, err);
    return null;
  }
}

async function embeddedPreview(file: string): Promise<Buffer | null> {
  for (const tag of ["-PreviewImage", "-ThumbnailImage", "-CoverArt"]) {
    try {
      const { stdout } = await execFileP(EXIFTOOL, ["-b", tag, file], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
      if (stdout.length > 0) return stdout;
    } catch {
      /* try next tag */
    }
  }
  return null;
}
