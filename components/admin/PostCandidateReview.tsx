"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PostCandidateResponse, PostCandidateStatus } from "@/models/Post";
import { StopInfoResponse } from "@/models/StopInfo";
import MediaStrip from "@/components/admin/MediaStrip";

type Counts = Record<PostCandidateStatus, number>;

const btn: React.CSSProperties = {
  border: "none",
  padding: "6px 12px",
  cursor: "pointer",
  borderRadius: "4px",
  color: "white",
  marginRight: "8px",
};

export default function PostCandidateReview() {
  const [status, setStatus] = useState<PostCandidateStatus>("pending");
  const [candidates, setCandidates] = useState<PostCandidateResponse[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [stops, setStops] = useState<StopInfoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const stopsById = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  useEffect(() => {
    fetch("/api/stops")
      .then((r) => r.json())
      .then(setStops)
      .catch((e) => console.error("Failed to fetch stops:", e));
  }, []);

  useEffect(() => {
    load(status);
  }, [status]);

  async function load(s: PostCandidateStatus) {
    setLoading(true);
    try {
      const r = await fetch(`/api/post-candidates?status=${s}`);
      const data = await r.json();
      setCandidates(data.candidates);
      setCounts(data.counts);
    } catch (e) {
      console.error("Failed to fetch candidates:", e);
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: "approve" | "reject" | "reset" | "suggest", stopId?: string | null) {
    setBusy(id);
    try {
      const r = await fetch(`/api/post-candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, stopId }),
      });
      if (!r.ok) throw new Error(await r.text());
      if (action === "suggest") {
        const updated: PostCandidateResponse = await r.json();
        setCandidates((cs) => cs.map((c) => (c.id === id ? updated : c)));
      } else {
        // Candidate moved to another status bucket: drop it from this list and refresh counts.
        setCandidates((cs) => cs.filter((c) => c.id !== id));
        const cr = await fetch("/api/post-candidates?countsOnly=true");
        setCounts((await cr.json()).counts);
      }
    } catch (e) {
      console.error(`Failed to ${action} candidate:`, e);
      alert(`Failed to ${action}. See console.`);
    } finally {
      setBusy(null);
    }
  }

  async function relink() {
    await fetch("/api/post-candidates", { method: "POST" });
    load(status);
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        {(["pending", "approved", "rejected"] as PostCandidateStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              ...btn,
              background: status === s ? "#0070f3" : "#e5e5e5",
              color: status === s ? "white" : "#333",
            }}
          >
            {s[0].toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button onClick={relink} style={{ ...btn, background: "#6c757d" }} title="Re-run date matching after editing stops">
          Re-suggest stops
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : candidates.length === 0 ? (
        <p>
          {status === "pending"
            ? "Nothing to review. Run `npm run import:facebook -- <export-dir>` to stage posts."
            : `No ${status} candidates.`}
        </p>
      ) : (
        candidates.map((c) => {
          const suggested = c.suggestedStopId ? stopsById.get(c.suggestedStopId) : undefined;
          const ambiguous = status === "pending" && !c.suggestedStopId;
          return (
            <div
              key={c.id}
              style={{
                border: `1px solid ${ambiguous ? "#f0ad4e" : "#ddd"}`,
                borderLeft: `4px solid ${ambiguous ? "#f0ad4e" : suggested ? "#28a745" : "#ddd"}`,
                borderRadius: "6px",
                padding: "12px 16px",
                marginBottom: "12px",
                background: "white",
                opacity: busy === c.id ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <strong>{formatDate(c.postedAt)}</strong>
                {c.place && <span style={{ color: "#555" }}>📍 {c.place.name}</span>}
                {ambiguous && <span style={{ color: "#b8860b" }}>No stop matched — pick one or skip</span>}
              </div>

              <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{c.body || <em>(no text)</em>}</p>
              <MediaStrip media={c.media} />

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                <label>
                  Stop:{" "}
                  <select
                    value={c.suggestedStopId ?? ""}
                    disabled={status !== "pending"}
                    onChange={(e) => act(c.id, "suggest", e.target.value || null)}
                  >
                    <option value="">— none —</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.arrivalDate.slice(0, 10)} → {s.departureDate.slice(0, 10)})
                      </option>
                    ))}
                  </select>
                </label>
                <span style={{ flex: 1 }} />
                {status === "pending" && (
                  <>
                    <button onClick={() => act(c.id, "approve")} style={{ ...btn, background: "#28a745" }}>
                      Approve
                    </button>
                    <button onClick={() => act(c.id, "reject")} style={{ ...btn, background: "#dc3545" }}>
                      Skip
                    </button>
                  </>
                )}
                {status === "approved" && c.postId && (
                  <Link href={`/admin/posts/${c.postId}`} style={{ color: "#0070f3", marginRight: "8px" }}>
                    Edit post
                  </Link>
                )}
                {status !== "pending" && (
                  <button onClick={() => act(c.id, "reset")} style={{ ...btn, background: "#6c757d" }}>
                    Back to queue
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
