import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveMediaPath, MIME_BY_EXT } from "@/lib/media";

type RouteParams = { params: Promise<{ path: string[] }> };

/** Serve files from MEDIA_DIR (imported post media, curated photos). */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { path: segments } = await params;
  const full = resolveMediaPath(segments.join("/"));
  if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = path.extname(full).toLowerCase();
  const data = fs.readFileSync(full);
  return new NextResponse(data, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Length": String(data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
