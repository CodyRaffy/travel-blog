"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CandidatePhoto, StopCandidateResponse } from "@/models/StopCandidate";

const btn: React.CSSProperties = {
  border: "none",
  padding: "6px 12px",
  cursor: "pointer",
  borderRadius: "4px",
  color: "white",
};

const input: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontFamily: "inherit",
  fontSize: "inherit",
};

export interface ApproveData {
  name: string;
  arrivalDate: string;
  departureDate: string;
  statePark: boolean;
  nationalPark: boolean;
  nationalMonument: boolean;
}

interface Props {
  candidate: StopCandidateResponse;
  selected: boolean;
  busy: boolean;
  mergeTargets: StopCandidateResponse[];
  onSelect: () => void;
  onApprove: (data: ApproveData) => void;
  onReject: () => void;
  onReset: () => void;
  onMergeInto: (targetId: string) => void;
  onRename: (name: string) => void;
}

const fmt = (iso: string) => iso.slice(0, 10);
const nights = (a: string, d: string) => Math.round((new Date(d).getTime() - new Date(a).getTime()) / 86400000);

export default function StopCandidateCard({
  candidate: c,
  selected,
  busy,
  mergeTargets,
  onSelect,
  onApprove,
  onReject,
  onReset,
  onMergeInto,
  onRename,
}: Props) {
  const [name, setName] = useState(c.suggestedName ?? "");
  const [arrival, setArrival] = useState(fmt(c.arrivalDate));
  const [departure, setDeparture] = useState(fmt(c.departureDate));
  const [statePark, setStatePark] = useState(false);
  const [nationalPark, setNationalPark] = useState(false);
  const [nationalMonument, setNationalMonument] = useState(false);
  const [photos, setPhotos] = useState<CandidatePhoto[] | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  useEffect(() => {
    setName(c.suggestedName ?? "");
    setArrival(fmt(c.arrivalDate));
    setDeparture(fmt(c.departureDate));
  }, [c.suggestedName, c.arrivalDate, c.departureDate]);

  useEffect(() => {
    if (!selected || photos) return;
    fetch(`/api/stop-candidates/${c.id}/photos?limit=12`)
      .then((r) => r.json())
      .then(setPhotos)
      .catch(() => setPhotos([]));
  }, [selected, photos, c.id]);

  const pending = c.status === "pending";
  const n = nights(c.arrivalDate, c.departureDate);

  return (
    <div
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? "#b5472f" : "#ddd"}`,
        borderLeft: `4px solid ${selected ? "#b5472f" : pending ? "#2e6b4f" : "#bbb"}`,
        borderRadius: "6px",
        padding: "12px 16px",
        marginBottom: "12px",
        background: "white",
        opacity: busy ? 0.6 : 1,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        {pending ? (
          <input
            value={name}
            placeholder="Stop name"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== (c.suggestedName ?? "") && onRename(name)}
            style={{ ...input, fontWeight: 600, fontSize: "1.05em", flex: "1 1 240px" }}
          />
        ) : (
          <strong style={{ flex: "1 1 240px" }}>{c.suggestedName ?? "Unnamed"}</strong>
        )}
        <span style={{ color: "#555", whiteSpace: "nowrap" }}>
          {fmt(c.arrivalDate)} → {fmt(c.departureDate)} · {n} night{n === 1 ? "" : "s"} · {c.photoCount} photos
        </span>
        <span style={{ color: "#888", fontSize: "0.85em" }}>
          {c.latLongTuple[0].toFixed(4)}, {c.latLongTuple[1].toFixed(4)}
        </span>
      </div>

      {selected && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "10px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", minHeight: "90px" }}>
            {photos === null ? (
              <span style={{ color: "#888" }}>Loading photos…</span>
            ) : photos.length === 0 ? (
              <span style={{ color: "#888" }}>No photos</span>
            ) : (
              photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={`/api/photos/${p.id}/thumb?size=160`}
                  alt={p.takenAt ?? ""}
                  title={`${p.takenAt ?? ""}\n${p.path}`}
                  height={90}
                  style={{ borderRadius: "4px", background: "#eee" }}
                  loading="lazy"
                />
              ))
            )}
          </div>

          {pending && (
            <>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <label>
                  Arrived <input type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} style={input} />
                </label>
                <label>
                  Left <input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} style={input} />
                </label>
                <label><input type="checkbox" checked={statePark} onChange={(e) => setStatePark(e.target.checked)} /> State Park</label>
                <label><input type="checkbox" checked={nationalPark} onChange={(e) => setNationalPark(e.target.checked)} /> National Park</label>
                <label><input type="checkbox" checked={nationalMonument} onChange={(e) => setNationalMonument(e.target.checked)} /> Nat&apos;l Monument</label>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <button
                  disabled={busy || !name.trim()}
                  onClick={() =>
                    onApprove({
                      name: name.trim(),
                      arrivalDate: `${arrival}T00:00:00.000Z`,
                      departureDate: `${departure}T00:00:00.000Z`,
                      statePark,
                      nationalPark,
                      nationalMonument,
                    })
                  }
                  style={{ ...btn, background: "#28a745" }}
                  title={name.trim() ? "Create this stop and draw the route from the previous stop" : "Give it a name first"}
                >
                  Approve → create stop
                </button>
                <button disabled={busy} onClick={onReject} style={{ ...btn, background: "#dc3545" }}>
                  Skip
                </button>
                <span style={{ flex: 1 }} />
                {mergeTargets.length > 0 && (
                  <label>
                    Merge into{" "}
                    <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} style={input}>
                      <option value="">— choose —</option>
                      {mergeTargets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.suggestedName ?? "Unnamed"} ({fmt(t.arrivalDate)} → {fmt(t.departureDate)})
                        </option>
                      ))}
                    </select>{" "}
                    <button
                      disabled={busy || !mergeTarget}
                      onClick={() => onMergeInto(mergeTarget)}
                      style={{ ...btn, background: "#6c757d" }}
                    >
                      Merge
                    </button>
                  </label>
                )}
              </div>
            </>
          )}

          {!pending && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
              {c.status === "approved" && c.stopId && (
                <Link href={`/admin/edit/${c.stopId}`} style={{ color: "#0070f3" }}>
                  Edit stop
                </Link>
              )}
              {c.status === "merged" && <span style={{ color: "#555" }}>Merged into another candidate</span>}
              <span style={{ flex: 1 }} />
              {c.status !== "approved" && (
                <button disabled={busy} onClick={onReset} style={{ ...btn, background: "#6c757d" }}>
                  Back to queue
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
