import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Gallery from "@/components/site/Gallery";
import PostCard from "@/components/site/PostCard";
import { getStops, getStopBySlug } from "@/lib/stops";
import { getStopGallery } from "@/lib/photos";
import { getPosts } from "@/lib/posts";
import { mediaUrl } from "@/lib/media";
import { fmtRange, fmtNights } from "@/lib/format";
import { GalleryPhoto } from "@/models/Photo";
import { categoryBadges } from "@/lib/categories";
import { vehicleByKey } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const stop = await getStopBySlug(slug);
  if (!stop) return { title: "Stop not found" };
  return {
    title: stop.name,
    description: `${fmtRange(stop.arrivalDate, stop.departureDate)} · ${fmtNights(stop.arrivalDate, stop.departureDate)}`,
    openGraph: stop.coverUrl ? { images: [stop.coverUrl] } : undefined,
  };
}

export default async function StopPage({ params }: Params) {
  const { slug } = await params;
  const stop = await getStopBySlug(slug);
  if (!stop) notFound();

  const [all, kept, posts] = await Promise.all([
    getStops(),
    getStopGallery(stop.id),
    getPosts({ stopId: stop.id, publishedOnly: true }),
  ]);
  const idx = all.findIndex((s) => s.id === stop.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  const gallery: GalleryPhoto[] = kept.map((p) => ({
    id: p.id,
    takenAt: p.takenAt,
    width: p.width,
    height: p.height,
    caption: p.caption,
    urls: { thumb: mediaUrl(p.variants!.thumb), medium: mediaUrl(p.variants!.medium), large: mediaUrl(p.variants!.large) },
  }));
  const hero = stop.coverPhotoId ? gallery.find((g) => g.id === stop.coverPhotoId) ?? gallery[0] : gallery[0];
  const badges = categoryBadges(stop);
  if (stop.vehicle !== "fifth_wheel") badges.push(vehicleByKey(stop.vehicle).label);

  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap">
        <div className={`hero${hero ? "" : " hero--plain"}`}>
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.urls.large} alt="" />
          )}
          <div className="overlay">
            <div>
              {badges.map((b) => (
                <span key={b} className="badge" style={{ background: "rgba(255,255,255,.18)", color: "white" }}>
                  {b}
                </span>
              ))}
            </div>
            <h1>{stop.name}</h1>
            <div className="dates">
              {fmtRange(stop.arrivalDate, stop.departureDate)} · {fmtNights(stop.arrivalDate, stop.departureDate)}
              {idx >= 0 && ` · stop ${idx + 1} of ${all.length}`}
            </div>
          </div>
        </div>

        <nav className="stop-nav" aria-label="Neighbouring stops">
          <span>{prev && <Link href={`/stops/${prev.slug}`}>← {prev.name}</Link>}</span>
          <span>{next && <Link href={`/stops/${next.slug}`}>{next.name} →</Link>}</span>
        </nav>

        {(stop.description || stop.link) && (
          <section className="section">
            {stop.description && <p className="prose">{stop.description}</p>}
            {stop.link && (
              <p>
                <a href={stop.link} target="_blank" rel="noopener noreferrer">
                  {new URL(stop.link).hostname.replace(/^www\./, "")} ↗
                </a>
              </p>
            )}
          </section>
        )}

        {gallery.length > 0 && (
          <section className="section">
            <h2>Photos</h2>
            <Gallery photos={gallery} />
          </section>
        )}

        {posts.length > 0 && (
          <section className="section">
            <h2>From the journal</h2>
            {[...posts].reverse().map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </section>
        )}

        {gallery.length === 0 && posts.length === 0 && !stop.description && (
          <p className="muted section">Photos and stories for this stop are still being sorted.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
