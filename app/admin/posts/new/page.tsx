"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import PostForm, { PostFormData } from "@/components/admin/PostForm";

export default function NewPostPage() {
  const router = useRouter();

  async function handleSubmit(data: PostFormData) {
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      router.push("/admin/posts");
    } catch (error) {
      console.error("Failed to create post:", error);
      alert("Failed to create post");
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>New Post</h1>
        <Link href="/admin/posts" style={{ color: "#0070f3" }}>
          Back to Posts
        </Link>
      </div>
      <PostForm onSubmit={handleSubmit} submitLabel="Create Post" />
    </div>
  );
}
