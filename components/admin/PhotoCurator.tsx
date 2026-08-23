"use client";

import { useCallback, useEffect, useState } from "react";
import { PhotoResponse, CurationStatus } from "@/models/Photo";
import { StopInfoResponse } from "@/models/StopInfo";

type Tab = "suggested" | "unreviewed" | "kept" | "skipped";
type Counts = Record<CurationStatus, number>;

const btn: React.CSSProperties = { border: "none", padding: "6px 12px", cursor: "pointer", borderRadius: "4px", color: "white" };
const tabStyle: React.CSSProperties = { ...btn };

interface Props {
  stop: StopInfoResponse;
  onStopChange: (stop: StopInfoResponse) => void;
}

export default function PhotoCurator({ stop, onStopChange }: Props) {
  const [tab, setTab] = useState<Tab>("suggested");
  const [photos, setPhotos] = useState<PhotoResponse[]>([]);
  const [counts, setCounts] = useState<Counts>({ unreviewed: 0, suggested: 0, kept: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<PhotoResponse | null>(null);
  const lightboxIndex = lightbox ? photos.findIndex((p) => p.id === lightbox.id) : -1;
  const stepLightbox = useCallback(
    (d: number) => {
      setLightbox((cur) => {
        if (!cur || photos.length === 0) return cur;
        const i = photos.findIndex((p) => p.id === cur.id);
        return photos[(i + d + photos.length) % photos.length];
      });
    },
    [photos]
  );
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, stepLightbox]);
  const navBtn = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    [side]: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,.15)",
    color: "white",
    border: "none",
    fontSize: 28,
    width: 44,
    height: 64,
    borderRadius: 8,
    cursor: "pointer",
  });

  const load = useCallback(
    async (t: Tab) => {
      setLoading(true);
      try {
        const r = await fetch(`/api/photos?stopId=${stop.id}&status=${t}`);
        const data = await r.json();
        setPhotos(data.photos);
        setCounts(data.counts);
      } finally {
        setLoading(false);
      }
    },
    [stop.id]
  );

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  async function suggest() {
    setMessage(null);
    const r = await fetch(`/api/stops/${stop.id}/photos/suggest?target=8`, { method: "POST" });
    const data = await r.json();
    setMessage(`Suggested ${data.suggested} photos.`);
    setTab("suggested");
    load("suggested");
  }

  async function setStatus(p: PhotoResponse, curationStatus: CurationStatus) {
    setBusy((b) => new Set(b).add(p.id));
    try {
      const r = await fetch(`/api/photos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curationStatus }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? r.statusText);
      const updated: PhotoResponse = await r.json();
      // Photo leaves this tab unless the tab is the one it moved to.
      setPhotos((ps) => (updated.curationStatus === tab ? ps.map((x) => (x.id === p.id ? updated : x)) : ps.filter((x) => x.id !== p.id)));
      setCounts((c) => ({ ...c, [p.curationStatus]: c[p.curationStatus] - 1, [curationStatus]: c[curationStatus] + 1 }));
      if (stop.coverPhotoId === p.id && curationStatus !== "kept") onStopChange({ ...stop, coverPhotoId: null });
    } catch (e) {
      setMessage(`Failed: ${(e as Error).message}`);
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(p.id);
        return n;
      });
    }
  }

  async function keepAllSuggested() {
    for (const p of photos.filter((x) => x.curationStatus === "suggested")) await setStatus(p, "kept");
  }

  async function setCover(p: PhotoResponse) {
    const r = await fetch(`/api/stops/${stop.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverPhotoId: p.id }),
    });
    if (r.ok) onStopChange(await r.json());
  }

  async function saveCaption(p: PhotoResponse, caption: string) {
    if (caption === (p.caption ?? "")) return;
    const r = await fetch(`/api/photos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: caption || null }),
    });
    if (r.ok) {
      const updated: PhotoResponse = await r.json();
      setPhotos((ps) => ps.map((x) => (x.id === p.id ? updated : x)));
    }
  }

  async function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = photos.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    const reordered = ids.map((id) => photos.find((p) => p.id === id)!);
    setPhotos(reordered);
    setDragId(null);
    await fetch("/api/photos/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopId: stop.id, orderedIds: ids }),
    });
  }

  /** Keep/skip the photo in the viewer, then move on to the next one (or close if it was the last). */
  function decideInLightbox(status: CurationStatus) {
    if (!lightbox) return;
    const i = photos.findIndex((p) => p.id === lightbox.id);
    const staysInTab = status === tab;
    const remaining = staysInTab ? photos : photos.filter((p) => p.id !== lightbox.id);
    const next = remaining.length === 0 ? null : staysInTab ? remaining[(i + 1) % remaining.length] : remaining[Math.min(i, remaining.length - 1)];
    setStatus(lightbox, status);
    setLightbox(next);
  }

  const total = counts.unreviewed + counts.suggested + counts.kept + counts.skipped;
  const thumb = (p: PhotoResponse, size = 320) =>
    p.variants ? `/api/media/${p.variants.thumb}` : `/api/photos/${p.id}/thumb?size=${size}`;

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "12px" }}>
        {(["suggested", "unreviewed", "kept", "skipped"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...tabStyle, background: tab === t ? "#0070f3" : "#e5e5e5", color: tab === t ? "white" : "#333" }}
          >
            {t === "unreviewed" ? "All others" : t[0].toUpperCase() + t.slice(1)} ({counts[t]})
          </button>
        ))}
        <span style={{ color: "#666", marginLeft: "8px" }}>{total.toLocaleString()} photos at this stop</span>
        <span style={{ flex: 1 }} />
        {tab === "suggested" && counts.suggested > 0 && (
          <button onClick={keepAllSuggested} style={{ ...btn, background: "#28a745" }}>
            Keep all suggested
          </button>
        )}
        <button onClick={suggest} style={{ ...btn, background: "#6c757d" }} title="Pick ~8 photos spread across the stay">
          {counts.suggested === 0 && counts.kept === 0 ? "Suggest photos" : "Re-suggest"}
        </button>
      </div>

      {message && <p style={{ background: "#e3ede6", padding: "8px 12px", borderRadius: "4px" }}>{message}</p>}
      {tab === "kept" && photos.length > 1 && (
        <p style={{ color: "#666", marginTop: 0 }}>Drag to reorder. Click ★ to make a photo the stop&apos;s cover.</p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : photos.length === 0 ? (
        <p style={{ color: "#666" }}>
          {tab === "suggested" && total > 0 ? 'Nothing suggested yet — click "Suggest photos".' : "No photos here."}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {photos.map((p) => {
            const isCover = stop.coverPhotoId === p.id;
            return (
              <div
                key={p.id}
                draggable={tab === "kept"}
                onDragStart={() => setDragId(p.id)}
                onDragOver={(e) => tab === "kept" && e.preventDefault()}
                onDrop={() => drop(p.id)}
                style={{
                  border: `2px solid ${isCover ? "#f0ad4e" : "#ddd"}`,
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: "white",
                  opacity: busy.has(p.id) ? 0.5 : 1,
                  cursor: tab === "kept" ? "grab" : "default",
                }}
              >
                <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#eee" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb(p)}
                    alt={p.caption ?? p.fileName}
                    loading="lazy"
                    onClick={() => setLightbox(p)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
                  />
                  {p.isVideo && (
                    <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,.6)", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
                      video
                    </span>
                  )}
                  {p.latitude == null && (
                    <span style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 12 }} title="No GPS; matched by date">
                      no GPS
                    </span>
                  )}
                  {isCover && (
                    <span style={{ position: "absolute", bottom: 6, left: 6, background: "#f0ad4e", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
                      ★ cover
                    </span>
                  )}
                </div>
                <div style={{ padding: "6px 8px", fontSize: "0.85em", color: "#555" }}>
                  {p.takenAt ? new Date(p.takenAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                </div>
                <div style={{ display: "flex", gap: "6px", padding: "0 8px 8px", flexWrap: "wrap" }}>
                  {p.curationStatus !== "kept" ? (
                    <button onClick={() => setStatus(p, "kept")} style={{ ...btn, background: "#28a745", padding: "4px 10px" }}>
                      Keep
                    </button>
                  ) : (
                    <button onClick={() => setCover(p)} disabled={isCover} style={{ ...btn, background: isCover ? "#ccc" : "#f0ad4e", padding: "4px 10px" }}>
                      ★ Cover
                    </button>
                  )}
                  {p.curationStatus !== "skipped" && (
                    <button onClick={() => setStatus(p, "skipped")} style={{ ...btn, background: "#dc3545", padding: "4px 10px" }}>
                      Skip
                    </button>
                  )}
                  {p.curationStatus === "skipped" && (
                    <button onClick={() => setStatus(p, "unreviewed")} style={{ ...btn, background: "#6c757d", padding: "4px 10px" }}>
                      Undo
                    </button>
                  )}
                </div>
                {p.curationStatus === "kept" && (
                  <input
                    defaultValue={p.caption ?? ""}
                    placeholder="Caption (optional)"
                    onBlur={(e) => saveCaption(p, e.target.value)}
                    style={{ width: "100%", border: "none", borderTop: "1px solid #eee", padding: "6px 8px", fontSize: "0.85em" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 1000, cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(lightbox, 1280)} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "95vw", maxHeight: "86vh", objectFit: "contain" }} />
          <div style={{ color: "white", opacity: 0.85, fontSize: "0.9em", display: "flex", gap: 12, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
            <span>
              {lightbox.takenAt ? new Date(lightbox.takenAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""} · {lightboxIndex + 1} / {photos.length}
            </span>
            {lightbox.curationStatus !== "kept" ? (
              <button onClick={() => decideInLightbox("kept")} style={{ ...btn, background: "#28a745", padding: "4px 10px" }}>Keep</button>
            ) : (
              <span style={{ color: "#9be29b" }}>kept</span>
            )}
            {lightbox.curationStatus !== "skipped" && (
              <button onClick={() => decideInLightbox("skipped")} style={{ ...btn, background: "#dc3545", padding: "4px 10px" }}>Skip</button>
            )}
            <span style={{ opacity: 0.6 }}>← → browse · Esc close</span>
          </div>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }} aria-label="Previous" style={navBtn("left")}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); stepLightbox(1); }} aria-label="Next" style={navBtn("right")}>›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
