"use client";

import { useEffect, useState } from "react";
import { PostMedia } from "@/models/Post";
import { StopInfoResponse } from "@/models/StopInfo";
import MediaStrip from "@/components/admin/MediaStrip";

export interface PostFormData {
  title: string | null;
  body: string;
  postedAt: string; // ISO
  stopId: string | null;
  published: boolean;
}

interface PostFormProps {
  initialData?: Partial<PostFormData>;
  media?: PostMedia[];
  onSubmit: (data: PostFormData) => void;
  submitLabel: string;
}

/** ISO -> value for <input type="datetime-local"> in the browser's local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostForm({ initialData, media = [], onSubmit, submitLabel }: PostFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [postedAt, setPostedAt] = useState(toLocalInput(initialData?.postedAt ?? new Date().toISOString()));
  const [stopId, setStopId] = useState(initialData?.stopId ?? "");
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [stops, setStops] = useState<StopInfoResponse[]>([]);

  useEffect(() => {
    fetch("/api/stops")
      .then((r) => r.json())
      .then(setStops)
      .catch((e) => console.error("Failed to fetch stops:", e));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      alert("Post text is required");
      return;
    }
    onSubmit({
      title: title.trim() || null,
      body,
      postedAt: new Date(postedAt).toISOString(),
      stopId: stopId || null,
      published,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    marginBottom: "12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontFamily: "inherit",
    fontSize: "inherit",
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "720px" }}>
      <label style={{ display: "block", marginBottom: "4px" }}>Title (optional)</label>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />

      <label style={{ display: "block", marginBottom: "4px" }}>Text</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} style={inputStyle} required />

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Posted</label>
          <input type="datetime-local" value={postedAt} onChange={(e) => setPostedAt(e.target.value)} style={inputStyle} required />
        </div>
        <div style={{ flex: "2 1 320px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Stop</label>
          <select value={stopId} onChange={(e) => setStopId(e.target.value)} style={inputStyle}>
            <option value="">— none —</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.arrivalDate.slice(0, 10)} → {s.departureDate.slice(0, 10)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {media.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Attached media</label>
          <MediaStrip media={media} />
        </div>
      )}

      <label style={{ display: "block", marginBottom: "16px" }}>
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published
      </label>

      <button
        type="submit"
        style={{
          background: "#0070f3",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
