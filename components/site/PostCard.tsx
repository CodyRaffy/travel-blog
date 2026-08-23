import Link from "next/link";
import { PostResponse } from "@/models/Post";
import { StopInfoResponse } from "@/models/StopInfo";
import { mediaUrl } from "@/lib/media";
import { fmtDateTime } from "@/lib/format";

interface PostCardProps {
  post: PostResponse;
  stop?: StopInfoResponse | null;
  /** Link the date to the post's own page. */
  linkToPost?: boolean;
}

export default function PostCard({ post, stop, linkToPost = true }: PostCardProps) {
  const when = fmtDateTime(post.postedAt);
  return (
    <article className="card post" id={post.id}>
      <div className="meta">
        {linkToPost ? <Link href={`/posts/${post.id}`}>{when}</Link> : <span>{when}</span>}
        {stop && (
          <>
            <span>·</span>
            <Link href={`/stops/${stop.slug}`}>{stop.name}</Link>
          </>
        )}
        {post.source === "facebook" && <span className="muted">from Facebook</span>}
      </div>
      {post.title && <h3>{post.title}</h3>}
      <div className="body">{post.body}</div>
      {post.media.length > 0 && (
        <div className="media">
          {post.media.map((m) => {
            const url = mediaUrl(m.path);
            return m.kind === "video" ? (
              <video key={m.path} src={url} controls preload="metadata" />
            ) : (
              <a key={m.path} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={m.description ?? ""} loading="lazy" />
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}
