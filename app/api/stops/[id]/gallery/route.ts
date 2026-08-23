import { NextRequest, NextResponse } from "next/server";
import { getStopById } from "@/lib/stops";
import { getStopGallery } from "@/lib/photos";
import { mediaUrl } from "@/lib/media";
import { GalleryPhoto } from "@/models/Photo";

type RouteParams = { params: Promise<{ id: string }> };

/** Public: the stop's curated photos (kept, with rendered web variants), in display order. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!(await getStopById(id))) return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  const gallery: GalleryPhoto[] = (await getStopGallery(id)).map((p) => ({
    id: p.id,
    takenAt: p.takenAt,
    width: p.width,
    height: p.height,
    caption: p.caption,
    urls: {
      thumb: mediaUrl(p.variants!.thumb),
      medium: mediaUrl(p.variants!.medium),
      large: mediaUrl(p.variants!.large),
    },
  }));
  return NextResponse.json(gallery, { headers: { "Cache-Control": "public, max-age=300" } });
}
