import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getThumbnail } from "@/lib/thumbs";

type RouteParams = { params: Promise<{ id: string }> };

const SIZES = new Set([160, 320, 640, 1280]);

/** JPEG thumbnail of a library photo. `?size=320` (160|320|640|1280). */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requested = Number(request.nextUrl.searchParams.get("size") ?? 320);
  const size = SIZES.has(requested) ? requested : 320;

  const photo = db.select({ path: schema.photos.dropboxPath }).from(schema.photos).where(eq(schema.photos.id, id)).get();
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const buf = await getThumbnail(id, photo.path, size);
  if (!buf) return NextResponse.json({ error: "Thumbnail unavailable" }, { status: 404 });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(buf.byteLength),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
