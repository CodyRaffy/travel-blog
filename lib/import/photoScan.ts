/**
 * Local photo library scanner.
 *
 * Walks PHOTO_ROOTS under PHOTO_LIBRARY_DIR, runs exiftool on new/changed files
 * (tracked in `scanned_files`), and upserts every photo taken inside the trip
 * date range into `photos`. Nothing is copied or downloaded; paths are stored
 * relative to the library root.
 */
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PHOTO_LIBRARY_DIR, PHOTO_ROOTS, TRIP_START, TRIP_END, EXIFTOOL } from "@/lib/import/config";

const { photos, scannedFiles } = schema;

const MEDIA_EXT = new Set([".jpg", ".jpeg", ".heic", ".heif", ".png", ".mov", ".mp4", ".m4v"]);

export interface ScanOptions {
  /** Re-run exiftool on every file, ignoring the scanned_files ledger. */
  force?: boolean;
  batchSize?: number;
  onProgress?: (msg: string) => void;
}

export interface ScanResult {
  filesSeen: number;
  filesScanned: number;
  photosUpserted: number;
  inRange: number;
}

interface FileStat {
  rel: string; // "/Pictures/2021/..." (forward slashes, leading slash)
  abs: string;
  size: number;
  mtimeMs: number;
}

/** Library-relative path ("/Pictures/x.jpg") -> absolute path on disk. */
export function absolutePhotoPath(rel: string): string {
  return path.join(PHOTO_LIBRARY_DIR, rel.replace(/^\/+/, ""));
}

function walk(root: string, out: FileStat[]) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
      } else if (e.isFile() && MEDIA_EXT.has(path.extname(e.name).toLowerCase())) {
        const st = fs.statSync(abs);
        if (st.size === 0) continue; // online-only placeholder
        const rel = "/" + path.relative(PHOTO_LIBRARY_DIR, abs).split(path.sep).join("/");
        out.push({ rel, abs, size: st.size, mtimeMs: Math.round(st.mtimeMs) });
      }
    }
  }
}

// ---- exiftool ----------------------------------------------------------------

interface ExifRow {
  SourceFile: string;
  DateTimeOriginal?: string;
  CreateDate?: string;
  MediaCreateDate?: string;
  GPSLatitude?: string;
  GPSLongitude?: string;
  ImageWidth?: string;
  ImageHeight?: string;
  Orientation?: string;
  Make?: string;
  Model?: string;
}

const EXIF_TAGS = [
  "-DateTimeOriginal",
  "-CreateDate",
  "-MediaCreateDate",
  "-GPSLatitude",
  "-GPSLongitude",
  "-ImageWidth",
  "-ImageHeight",
  "-Orientation",
  "-Make",
  "-Model",
];

/** Minimal CSV parser for exiftool output (handles quoted fields with commas/newlines). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function runExiftool(files: string[]): Promise<ExifRow[]> {
  return new Promise((resolve, reject) => {
    const argFile = path.join(PHOTO_LIBRARY_DIR, `.travel-blog-exiftool-${process.pid}.txt`);
    fs.writeFileSync(argFile, files.join("\n"), "utf-8");
    const args = ["-fast2", "-csv", "-n", "-q", "-charset", "filename=utf8", ...EXIF_TAGS, "-@", argFile];
    const child = spawn(EXIFTOOL, args, { windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      fs.rmSync(argFile, { force: true });
      if (code !== 0 && !out) return reject(new Error(`exiftool exited ${code}: ${err.slice(0, 500)}`));
      resolve(parseCsv(out) as unknown as ExifRow[]);
    });
  });
}

// ---- date handling -------------------------------------------------------------

/** "2021:03:01 13:26:03" (optionally with fraction / zone) -> "2021-03-01T13:26:03" */
function exifDateToIso(v?: string): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  if (m[1] === "0000") return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

/** Dropbox camera-upload names: "2021-03-01 13.26.03.jpg" */
function filenameDate(name: string): string | null {
  const m = name.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2})\.(\d{2})\.(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null;
}

function mtimeDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19);
}

export function pickTakenAt(row: ExifRow | undefined, file: FileStat): string {
  return (
    exifDateToIso(row?.DateTimeOriginal) ??
    exifDateToIso(row?.CreateDate) ??
    exifDateToIso(row?.MediaCreateDate) ??
    filenameDate(path.basename(file.rel)) ??
    mtimeDate(file.mtimeMs)
  );
}

function inTripRange(takenAt: string): boolean {
  return takenAt >= TRIP_START && takenAt < TRIP_END;
}

const num = (v?: string) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);

// ---- main ------------------------------------------------------------------------

export async function scanPhotoLibrary(opts: ScanOptions = {}): Promise<ScanResult> {
  const log = opts.onProgress ?? (() => {});
  const batchSize = opts.batchSize ?? 2000;

  const files: FileStat[] = [];
  for (const root of PHOTO_ROOTS) {
    const abs = path.join(PHOTO_LIBRARY_DIR, root);
    if (!fs.existsSync(abs)) {
      log(`warning: root not found, skipping: ${abs}`);
      continue;
    }
    const before = files.length;
    walk(abs, files);
    log(`${root}: ${files.length - before} media files`);
  }

  // Decide what needs exiftool.
  const ledger = new Map(
    db
      .select({ path: scannedFiles.path, size: scannedFiles.size, mtimeMs: scannedFiles.mtimeMs })
      .from(scannedFiles)
      .all()
      .map((r) => [r.path, r])
  );
  const todo = opts.force
    ? files
    : files.filter((f) => {
        const l = ledger.get(f.rel);
        return !l || l.size !== f.size || l.mtimeMs !== f.mtimeMs;
      });
  log(`${todo.length} of ${files.length} files need scanning`);

  // Drop ledger/photo rows for files that no longer exist.
  const present = new Set(files.map((f) => f.rel));
  const gone = [...ledger.keys()].filter((p) => !present.has(p));
  if (gone.length) {
    db.transaction((tx) => {
      for (const p of gone) {
        tx.delete(scannedFiles).where(eq(scannedFiles.path, p)).run();
        tx.delete(photos).where(eq(photos.dropboxPath, p)).run();
      }
    });
    log(`removed ${gone.length} files no longer on disk`);
  }

  const result: ScanResult = { filesSeen: files.length, filesScanned: 0, photosUpserted: 0, inRange: 0 };
  const nowIso = () => new Date().toISOString();

  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    const rows = await runExiftool(batch.map((f) => f.abs));
    // exiftool echoes SourceFile with forward slashes; map back to our FileStat.
    const byAbs = new Map(batch.map((f) => [f.abs.replace(/\\/g, "/").toLowerCase(), f]));
    const rowByRel = new Map<string, ExifRow>();
    for (const r of rows) {
      const f = byAbs.get(path.resolve(r.SourceFile).replace(/\\/g, "/").toLowerCase());
      if (f) rowByRel.set(f.rel, r);
    }

    db.transaction((tx) => {
      for (const f of batch) {
        const r = rowByRel.get(f.rel);
        const takenAt = pickTakenAt(r, f);
        const inRange = inTripRange(takenAt);
        if (inRange) {
          const lat = num(r?.GPSLatitude);
          const lng = num(r?.GPSLongitude);
          const orient = num(r?.Orientation) ?? 1;
          let width = num(r?.ImageWidth);
          let height = num(r?.ImageHeight);
          if (orient >= 5 && width && height) [width, height] = [height, width];
          tx.insert(photos)
            .values({
              id: crypto.randomUUID(),
              dropboxPath: f.rel,
              fileName: path.basename(f.rel),
              sizeBytes: f.size,
              takenAt,
              latitude: lat,
              longitude: lng,
              width,
              height,
            })
            .onConflictDoUpdate({
              target: photos.dropboxPath,
              set: { fileName: path.basename(f.rel), sizeBytes: f.size, takenAt, latitude: lat, longitude: lng, width, height, updatedAt: nowIso() },
            })
            .run();
          result.photosUpserted++;
          result.inRange++;
        } else {
          tx.delete(photos).where(eq(photos.dropboxPath, f.rel)).run();
        }
        tx.insert(scannedFiles)
          .values({ path: f.rel, size: f.size, mtimeMs: f.mtimeMs, inRange, scannedAt: nowIso() })
          .onConflictDoUpdate({
            target: scannedFiles.path,
            set: { size: f.size, mtimeMs: f.mtimeMs, inRange, scannedAt: nowIso() },
          })
          .run();
      }
    });
    result.filesScanned += batch.length;
    log(`scanned ${Math.min(i + batchSize, todo.length)}/${todo.length} (${result.inRange} in trip range so far)`);
  }

  return result;
}

export function photoLibraryStats() {
  const total = db.select({ n: sql<number>`count(*)` }).from(photos).get()?.n ?? 0;
  const withGps = db.select({ n: sql<number>`count(*)` }).from(photos).where(sql`latitude is not null`).get()?.n ?? 0;
  const range = db
    .select({ min: sql<string>`min(taken_at)`, max: sql<string>`max(taken_at)` })
    .from(photos)
    .get();
  return { total, withGps, from: range?.min ?? null, to: range?.max ?? null };
}
