import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import PostCard from "@/components/site/PostCard";
import { getPostById } from "@/lib/posts";
import { getStopById } from "@/lib/stops";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post || !post.published) return { title: "Post not found" };
  return { title: post.title ?? `Journal · ${fmtDateTime(post.postedAt)}`, description: post.body.slice(0, 160) };
}

export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post || !post.published) notFound();
  const stop = post.stopId ? await getStopById(post.stopId) : null;

  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap wrap--narrow">
        <p>
          <Link href="/posts">← All journal entries</Link>
        </p>
        <PostCard post={post} stop={stop} linkToPost={false} />
      </main>
      <SiteFooter />
    </div>
  );
}
