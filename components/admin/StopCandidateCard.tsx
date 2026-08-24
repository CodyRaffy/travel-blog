"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CategoryPicker from "@/components/admin/CategoryPicker";
import { StopCategoryFlags, emptyFlags } from "@/lib/categories";
import { VEHICLES, defaultVehicleFor, type VehicleKey } from "@/lib/vehicles";
import { homeEraAt } from "@/data/ImportantMarkers";
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

export interface ApproveData extends StopCategoryFlags {
  vehicle: VehicleKey;
  name: string;
  arrivalDate: string;
  departureDate: string;
  link: string;
}

const kmFromHome = (lat: number, lng: number, whenIso: string) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [hLat, hLng] = homeEraAt(whenIso).latLng;
  const x = Math.sin(toRad(lat - hLat) / 2) ** 2 + Math.cos(toRad(hLat)) * Math.cos(toRad(lat)) * Math.sin(toRad(lng - hLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
};

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
  const [link, setLink] = useState(c.suggestedLink ?? "");
  const [vehicle, setVehicle] = useState<VehicleKey>(defaultVehicleFor(c.arrivalDate));
  const [flags, setFlags] = useState<StopCategoryFlags>(() => ({
    ...emptyFlags(),
    homeBase: kmFromHome(c.latLongTuple[0], c.latLongTuple[1], c.arrivalDate) < 5,
  }));
  const [photos, setPhotos] = useState<CandidatePhoto[] | null>(null);
  const [showingAll, setShowingAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    if (viewing === null || !photos) return;
    const n = photos.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewing(null);
      if (e.key === "ArrowRight") setViewing((i) => (i === null ? null : (i + 1) % n));
      if (e.key === "ArrowLeft") setViewing((i) => (i === null ? null : (i - 1 + n) % n));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, photos]);

  useEffect(() => {
    setName(c.suggestedName ?? "");
    setArrival(fmt(c.arrivalDate));
    setDeparture(fmt(c.departureDate));
    setLink(c.suggestedLink ?? "");
  }, [c.suggestedName, c.suggestedLink, c.arrivalDate, c.departureDate]);


  useEffect(() => {
    if (!selected || photos) return;
    fetch(`/api/stop-candidates/${c.id}/photos?limit=12`)
      .then((r) => r.json())
      .then(setPhotos)
      .catch(() => setPhotos([]));
  }, [selected, photos, c.id]);

  async function loadAll() {
    setLoadingAll(true);
    try {
      const r = await fetch(`/api/stop-candidates/${c.id}/photos?limit=all`);
      setPhotos(await r.json());
      setShowingAll(true);
    } finally {
      setLoadingAll(false);
    }
  }

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
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", minHeight: "90px", maxHeight: showingAll ? "60vh" : undefined, overflowY: showingAll ? "auto" : undefined }}>
            {photos === null ? (
              <span style={{ color: "#888" }}>Loading photos…</span>
            ) : photos.length === 0 ? (
              <span style={{ color: "#888" }}>No photos</span>
            ) : (
              photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={`/api/photos/${p.id}/thumb?size=160`}
                  alt={p.takenAt ?? ""}
                  title={`${p.takenAt ?? ""}\n${p.path}`}
                  height={90}
                  onClick={() => setViewing(i)}
                  style={{ borderRadius: "4px", background: "#eee", cursor: "zoom-in" }}
                  loading="lazy"
                />
              ))
            )}
          </div>
          {viewing !== null && photos && photos[viewing] && (
            <div
              onClick={() => setViewing(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "zoom-out" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${photos[viewing].id}/thumb?size=1280`}
                alt=""
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "95vw", maxHeight: "88vh", objectFit: "contain" }}
              />
              <div style={{ color: "white", opacity: 0.85, fontSize: "0.9em" }}>
                {photos[viewing].takenAt} · {viewing + 1} / {photos.length} · ← → to browse, Esc to close
              </div>
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewing((viewing - 1 + photos.length) % photos.length); }}
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.15)", color: "white", border: "none", fontSize: 28, width: 44, height: 64, borderRadius: 8, cursor: "pointer" }}
                    aria-label="Previous"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewing((viewing + 1) % photos.length); }}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.15)", color: "white", border: "none", fontSize: 28, width: 44, height: 64, borderRadius: 8, cursor: "pointer" }}
                    aria-label="Next"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          )}
          {photos && photos.length > 0 && !showingAll && c.photoCount > photos.length && (
            <button
              onClick={loadAll}
              disabled={loadingAll}
              style={{ background: "none", border: "none", color: "#0070f3", cursor: "pointer", padding: "6px 0", fontSize: "0.9em" }}
            >
              {loadingAll ? "Loading…" : `Show all ${c.photoCount} photos`}
            </button>
          )}

          {pending && (
            <>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <label>
                  Arrived <input type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} style={input} />
                </label>
                <label>
                  Left <input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} style={input} />
                </label>
                <input
                  type="url"
                  value={link}
                  placeholder="Website (optional)"
                  onChange={(e) => setLink(e.target.value)}
                  style={{ ...input, flex: "1 1 320px" }}
                />
                <CategoryPicker value={flags} onChange={setFlags} compact />
                <label>
                  Vehicle{" "}
                  <select value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleKey)} style={input}>
                    {VEHICLES.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <button
                  disabled={busy || !name.trim()}
                  onClick={() =>
                    onApprove({
                      name: name.trim(),
                      arrivalDate: `${arrival}T00:00:00.000Z`,
                      departureDate: `${departure}T00:00:00.000Z`,
                      link: link.trim(),
                      ...flags,
                      vehicle,
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
