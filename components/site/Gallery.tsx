"use client";

import { useCallback, useEffect, useState } from "react";
import { GalleryPhoto } from "@/models/Photo";

export default function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : (i + d + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="gallery">
        {photos.map((p, i) => {
          const ratio = p.width && p.height ? p.width / p.height : 1.33;
          const cls = i === 0 && ratio > 1.2 ? "wide tall" : ratio > 1.7 ? "wide" : ratio < 0.8 ? "tall" : "";
          return (
            <button key={p.id} className={cls} onClick={() => setOpen(i)} aria-label={p.caption ?? "Open photo"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.urls.thumb} alt={p.caption ?? ""} loading="lazy" />
            </button>
          );
        })}
      </div>

      {open !== null && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <button className="close" aria-label="Close" onClick={() => setOpen(null)}>
            ×
          </button>
          {photos.length > 1 && (
            <>
              <button className="nav prev" aria-label="Previous" onClick={(e) => (e.stopPropagation(), step(-1))}>
                ‹
              </button>
              <button className="nav next" aria-label="Next" onClick={(e) => (e.stopPropagation(), step(1))}>
                ›
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[open].urls.large} alt={photos[open].caption ?? ""} onClick={(e) => e.stopPropagation()} />
          <div className="caption">
            {photos[open].caption}
            {photos[open].caption && photos[open].takenAt && " · "}
            {photos[open].takenAt && new Date(photos[open].takenAt!).toLocaleDateString("en-US", { dateStyle: "medium" })}
            <span style={{ opacity: 0.6, marginLeft: "0.75rem" }}>
              {open + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
