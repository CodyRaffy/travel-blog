/**
 * Photo import configuration. Every value can be overridden with an environment
 * variable (put them in .env.local for dev, or the compose file on the server).
 */

/** Root of the synced Dropbox folder containing the photo library. */
export const PHOTO_LIBRARY_DIR = process.env.PHOTO_LIBRARY_DIR ?? "C:\\Dropbox";

/** Folders under PHOTO_LIBRARY_DIR to scan (comma-separated in env). */
export const PHOTO_ROOTS = (process.env.PHOTO_ROOTS ?? "Camera Uploads,Camera Uploads (Old),Pictures")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Only photos taken in [TRIP_START, TRIP_END) are imported. Naive local ISO. */
export const TRIP_START = process.env.TRIP_START ?? "2020-12-01T00:00:00";
export const TRIP_END = process.env.TRIP_END ?? "2024-05-01T00:00:00";

export const EXIFTOOL = process.env.EXIFTOOL ?? "C:\\Program Files\\exiftool-13.45_64\\exiftool.exe";

// ---- clustering --------------------------------------------------------------

/** Days whose overnight place is within this distance of a cluster centre belong to the same stop (day trips from a base routinely exceed 10 km). */
export const CLUSTER_RADIUS_KM = Number(process.env.CLUSTER_RADIUS_KM ?? 30);
/** Days without GPS photos that may be bridged if the next located day is at the same place. */
export const CLUSTER_MAX_GAP_DAYS = Number(process.env.CLUSTER_MAX_GAP_DAYS ?? 7);
/** A candidate needs at least this many distinct days OR this many photos to be proposed. */
export const CLUSTER_MIN_DAYS = Number(process.env.CLUSTER_MIN_DAYS ?? 2);
export const CLUSTER_MIN_PHOTOS = Number(process.env.CLUSTER_MIN_PHOTOS ?? 15);

/** Nominatim requires a contact in the User-Agent and max 1 request/second. */
export const NOMINATIM_USER_AGENT = process.env.NOMINATIM_USER_AGENT ?? "raffys-on-the-road-blog/1.0 (home project)";
export const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
