import type { PhotoVariants } from "@/lib/db/schema";

export type { PhotoVariants };
export type CurationStatus = "unreviewed" | "suggested" | "kept" | "skipped";

export interface PhotoResponse {
  id: string;
  /** Library-relative path (admin only; never rendered publicly). */
  path: string;
  fileName: string;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  width: number | null;
  height: number | null;
  stopId: string | null;
  curationStatus: CurationStatus;
  score: number | null;
  sortOrder: number | null;
  caption: string | null;
  variants: PhotoVariants | null;
  isVideo: boolean;
}

/** Public shape: only what a gallery needs. */
export interface GalleryPhoto {
  id: string;
  takenAt: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  /** Public URLs of the web variants. */
  urls: { thumb: string; medium: string; large: string };
}
