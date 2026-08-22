import { NextRequest, NextResponse } from "next/server";
import { getPostById, updatePost, deletePost } from "@/lib/posts";
import { UpdatePostInput } from "@/models/Post";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body: UpdatePostInput = await request.json();
  const post = await updatePost(id, body);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const deleted = await deletePost(id);
  if (!deleted) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
