import { NextRequest, NextResponse } from "next/server";
import { getPosts, createPost } from "@/lib/posts";
import { CreatePostInput } from "@/models/Post";

export async function GET(request: NextRequest) {
  const stopId = request.nextUrl.searchParams.get("stopId") ?? undefined;
  const publishedOnly = request.nextUrl.searchParams.get("published") === "true";
  return NextResponse.json(await getPosts({ stopId, publishedOnly }));
}

export async function POST(request: NextRequest) {
  const body: CreatePostInput = await request.json();
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  const post = await createPost({ ...body, source: "manual" });
  return NextResponse.json(post, { status: 201 });
}
