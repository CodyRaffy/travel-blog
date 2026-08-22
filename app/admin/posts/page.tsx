"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PostResponse } from "@/models/Post";
import { StopInfoResponse } from "@/models/StopInfo";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [stops, setStops] = useState<StopInfoResponse[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  const stopsById = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  useEffect(() => {
    Promise.all([
      fetch("/api/posts").then((r) => r.json()),
      fetch("/api/stops").then((r) => r.json()),
      fetch("/api/post-candidates?countsOnly=true").then((r) => r.json()),
    ])
      .then(([p, s, c]) => {
        setPosts(p);
        setStops(s);
        setPending(c.counts.pending);
      })
      .catch((e) => console.error("Failed to load posts:", e))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    const r = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (r.ok) setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
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
        <h1>Admin - Posts</h1>
        <div>
          <Link href="/admin" style={{ marginRight: "16px", color: "#0070f3" }}>
            Stops
          </Link>
          <Link href="/admin/posts/review" style={{ marginRight: "16px", color: "#0070f3" }}>
            Review imports{pending > 0 && ` (${pending})`}
          </Link>
          <Link
            href="/admin/posts/new"
            style={{
              background: "#0070f3",
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              textDecoration: "none",
            }}
          >
            New Post
          </Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <p>No posts yet. Write one, or import your Facebook export and approve posts in the review queue.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #333" }}>
              <th style={{ textAlign: "left", padding: "8px" }}>Posted</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Text</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Stop</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Media</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Source</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #ddd", opacity: p.published ? 1 : 0.6 }}>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  {new Date(p.postedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "8px" }}>
                  {p.title && <strong>{p.title} — </strong>}
                  {p.body.length > 120 ? p.body.slice(0, 120) + "…" : p.body}
                  {!p.published && <em> (draft)</em>}
                </td>
                <td style={{ padding: "8px" }}>{p.stopId ? (stopsById.get(p.stopId)?.name ?? "?") : "—"}</td>
                <td style={{ padding: "8px" }}>{p.media.length || ""}</td>
                <td style={{ padding: "8px" }}>{p.source}</td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  <Link href={`/admin/posts/${p.id}`} style={{ marginRight: "8px", color: "#0070f3" }}>
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Delete this post?")) handleDelete(p.id);
                    }}
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "4px 8px",
                      cursor: "pointer",
                      borderRadius: "4px",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
