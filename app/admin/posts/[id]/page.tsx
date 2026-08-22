"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PostResponse } from "@/models/Post";
import PostForm, { PostFormData } from "@/components/admin/PostForm";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<PostResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPost)
      .catch((e) => console.error("Failed to fetch post:", e))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: PostFormData) {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      router.push("/admin/posts");
    } catch (error) {
      console.error("Failed to update post:", error);
      alert("Failed to update post");
    }
  }

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (!post) return <div style={{ padding: "20px" }}>Post not found</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>Edit Post</h1>
        <Link href="/admin/posts" style={{ color: "#0070f3" }}>
          Back to Posts
        </Link>
      </div>
      {post.source === "facebook" && (
        <p style={{ color: "#555" }}>
          Imported from Facebook ({new Date(post.postedAt).toLocaleDateString()}).
        </p>
      )}
      <PostForm initialData={post} media={post.media} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
}
