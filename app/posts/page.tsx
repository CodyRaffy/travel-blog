import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import PostCard from "@/components/site/PostCard";
import { getPosts } from "@/lib/posts";
import { getStops } from "@/lib/stops";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journal" };

export default async function PostsPage() {
  const [posts, stops] = await Promise.all([getPosts({ publishedOnly: true }), getStops()]);
  const stopsById = new Map(stops.map((s) => [s.id, s]));
  const byYear = new Map<number, typeof posts>();
  for (const p of posts) {
    const y = new Date(p.postedAt).getFullYear();
    (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(p);
  }

  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap wrap--narrow">
        <div className="eyebrow">Written along the way</div>
        <h1>Journal</h1>
        <p className="lede">{posts.length} entries, newest first.</p>

        {[...byYear.entries()].map(([year, list]) => (
          <section key={year}>
            <h2 className="post-year">{year}</h2>
            {list.map((p) => (
              <PostCard key={p.id} post={p} stop={p.stopId ? stopsById.get(p.stopId) : null} />
            ))}
          </section>
        ))}
        {posts.length === 0 && <p className="muted">Nothing published yet.</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
