"use client";

import Link from "next/link";
import PostCandidateReview from "@/components/admin/PostCandidateReview";

export default function ReviewPostsPage() {
  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <h1>Review Imported Posts</h1>
        <div>
          <Link href="/admin" style={{ marginRight: "16px", color: "#0070f3" }}>
            Stops
          </Link>
          <Link href="/admin/posts" style={{ color: "#0070f3" }}>
            Posts
          </Link>
        </div>
      </div>
      <p style={{ color: "#555" }}>
        Each imported post is matched to the stop whose dates contain it. Approve to publish it as a blog
        entry, or skip it.
      </p>
      <PostCandidateReview />
    </div>
  );
}
