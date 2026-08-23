"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StopCandidateResponse, StopCandidateStatus } from "@/models/StopCandidate";
import { StopInfoResponse } from "@/models/StopInfo";
import StopCandidateCard, { ApproveData } from "@/components/admin/StopCandidateCard";

const CandidateMap = dynamic(() => import("@/components/admin/CandidateMap"), { ssr: false });

type Counts = Record<StopCandidateStatus, number>;
interface LibraryStats {
  total: number;
  withGps: number;
  from: string | null;
  to: string | null;
}

const tab: React.CSSProperties = { border: "none", padding: "6px 12px", cursor: "pointer", borderRadius: "4px" };

export default function StopCandidateReview() {
  const [status, setStatus] = useState<StopCandidateStatus>("pending");
  const [candidates, setCandidates] = useState<StopCandidateResponse[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0, merged: 0 });
  const [library, setLibrary] = useState<LibraryStats | null>(null);
  const [stops, setStops] = useState<StopInfoResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStops = useCallback(() => {
    fetch("/api/stops")
      .then((r) => r.json())
      .then(setStops)
      .catch((e) => console.error("Failed to fetch stops:", e));
  }, []);

  const load = useCallback(async (s: StopCandidateStatus) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/stop-candidates?status=${s}`);
      const data = await r.json();
      setCandidates(data.candidates);
      setCounts(data.counts);
      setLibrary(data.library);
    } catch (e) {
      console.error("Failed to fetch candidates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStops();
  }, [loadStops]);
  useEffect(() => {
    load(status);
  }, [status, load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setMessage(null);
    try {
      const r = await fetch(`/api/stop-candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? r.statusText);
      return await r.json();
    } catch (e) {
      console.error(e);
      setMessage(`Failed: ${(e as Error).message}`);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function refreshCounts() {
    const r = await fetch("/api/stop-candidates?countsOnly=true");
    setCounts((await r.json()).counts);
  }

  async function approve(c: StopCandidateResponse, data: ApproveData) {
    const res = await patch(c.id, { action: "approve", ...data });
    if (!res) return;
    setCandidates((cs) => cs.filter((x) => x.id !== c.id));
    setMessage(`Created stop "${res.stop.name}"${res.routed ? " and drew the road route from the previous stop" : " (no route drawn — first stop or routing unavailable)"}.`);
    loadStops();
    refreshCounts();
  }

  async function simple(c: StopCandidateResponse, action: "reject" | "reset") {
    if (await patch(c.id, { action })) {
      setCandidates((cs) => cs.filter((x) => x.id !== c.id));
      refreshCounts();
    }
  }

  async function mergeInto(source: StopCandidateResponse, targetId: string) {
    const updated = await patch(targetId, { action: "merge", sourceIds: [source.id] });
    if (!updated) return;
    setCandidates((cs) => cs.filter((x) => x.id !== source.id).map((x) => (x.id === targetId ? updated : x)));
    setSelectedId(targetId);
    refreshCounts();
  }

  async function rename(c: StopCandidateResponse, name: string) {
    const updated = await patch(c.id, { action: "update", suggestedName: name || null });
    if (updated) setCandidates((cs) => cs.map((x) => (x.id === c.id ? updated : x)));
  }

  async function regenerate() {
    if (!confirm("Re-cluster photos? Pending candidates will be replaced (approved/skipped decisions are kept).")) return;
    setRegenerating(true);
    setMessage(null);
    try {
      const r = await fetch("/api/stop-candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const res = await r.json();
      setMessage(`${res.clusters} clusters → ${res.proposed} candidates (${res.skippedAlreadyHandled} already handled).`);
      setStatus("pending");
      load("pending");
    } catch (e) {
      setMessage(`Failed: ${(e as Error).message}`);
    } finally {
      setRegenerating(false);
    }
  }

  const pendingForMerge = candidates.filter((c) => c.status === "pending");

  return (
    <div>
      {library && (
        <p style={{ color: "#555", marginTop: 0 }}>
          Library: {library.total.toLocaleString()} trip photos, {library.withGps.toLocaleString()} with GPS
          {library.from && ` · ${library.from.slice(0, 10)} → ${library.to?.slice(0, 10)}`}
          {library.total === 0 && " — run `npm run photos:scan` first"}
        </p>
      )}

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        {(["pending", "approved", "rejected", "merged"] as StopCandidateStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{ ...tab, background: status === s ? "#0070f3" : "#e5e5e5", color: status === s ? "white" : "#333" }}
          >
            {s[0].toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button onClick={regenerate} disabled={regenerating} style={{ ...tab, background: "#6c757d", color: "white" }}>
          {regenerating ? "Clustering…" : "Re-cluster photos"}
        </button>
      </div>

      {message && (
        <p style={{ background: "#e3ede6", padding: "8px 12px", borderRadius: "4px", color: "#23312b" }}>{message}</p>
      )}

      <CandidateMap candidates={candidates} stops={stops} selectedId={selectedId} onSelect={setSelectedId} />

      {loading ? (
        <p>Loading…</p>
      ) : candidates.length === 0 ? (
        <p>
          {status === "pending"
            ? "No candidates to review. Run `npm run photos:cluster` (or click Re-cluster photos)."
            : `No ${status} candidates.`}
        </p>
      ) : (
        candidates.map((c) => (
          <StopCandidateCard
            key={c.id}
            candidate={c}
            selected={selectedId === c.id}
            busy={busy === c.id}
            mergeTargets={pendingForMerge.filter((t) => t.id !== c.id)}
            onSelect={() => setSelectedId(c.id)}
            onApprove={(data) => approve(c, data)}
            onReject={() => simple(c, "reject")}
            onReset={() => simple(c, "reset")}
            onMergeInto={(t) => mergeInto(c, t)}
            onRename={(name) => rename(c, name)}
          />
        ))
      )}
    </div>
  );
}
