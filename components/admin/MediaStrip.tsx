"use client";

import { PostMedia } from "@/models/Post";
import { mediaUrl } from "@/lib/media";

interface MediaStripProps {
  media: PostMedia[];
  size?: number;
}

/** Thumbnail row for a post's attached photos/videos. */
export default function MediaStrip({ media, size = 120 }: MediaStripProps) {
  if (media.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
      {media.map((m) => {
        const url = mediaUrl(m.path);
        return (
          <a key={m.path} href={url} target="_blank" rel="noopener noreferrer" title={m.description ?? m.path}>
            {m.kind === "video" ? (
              <video src={url} width={size} height={size} style={{ objectFit: "cover", borderRadius: "4px", background: "#000" }} muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={m.description ?? ""} width={size} height={size} style={{ objectFit: "cover", borderRadius: "4px" }} loading="lazy" />
            )}
          </a>
        );
      })}
    </div>
  );
}
