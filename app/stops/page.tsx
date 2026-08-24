import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import StopCard from "@/components/site/StopCard";
import { getStops } from "@/lib/stops";
import Link from "next/link";
import { yearOf, nights, isRvEra } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stops" };

type Search = { searchParams: Promise<{ era?: string }> };

export default async function StopsPage({ searchParams }: Search) {
  const { era = "all" } = await searchParams;
  const all = await getStops();
  const stops = all.filter((s) => (era === "rv" ? isRvEra(s.arrivalDate) : era === "trips" ? !isRvEra(s.arrivalDate) : true));
  const byYear = new Map<number, typeof stops>();
  for (const s of stops) {
    const y = yearOf(s.arrivalDate);
    (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(s);
  }
  const totalNights = stops.reduce((n, s) => n + nights(s.arrivalDate, s.departureDate), 0);

  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap">
        <div className="eyebrow">The whole trip, in order</div>
        <h1>Every stop along the way</h1>
        <p className="lede">
          {stops.length} stops and {totalNights.toLocaleString()} nights on the road
          {stops.length > 0 && `, ${yearOf(stops[0].arrivalDate)} to ${yearOf(stops[stops.length - 1].departureDate)}`}.
        </p>

        <nav className="era-tabs" aria-label="Trip filter">
          <Link href="/stops" aria-current={era === "all" ? "page" : undefined}>
            All
          </Link>
          <Link href="/stops?era=rv" aria-current={era === "rv" ? "page" : undefined}>
            The RV years
          </Link>
          <Link href="/stops?era=trips" aria-current={era === "trips" ? "page" : undefined}>
            Trips from home
          </Link>
        </nav>

        <div className="timeline">
          {[...byYear.entries()].map(([year, list]) => (
            <section key={year}>
              <div className="timeline-year">
                <h2>
                  {year}
                  <span>
                    {list.length} stops · {list.reduce((n, s) => n + nights(s.arrivalDate, s.departureDate), 0)} nights
                  </span>
                </h2>
              </div>
              <div className="stop-list">
                {list.map((s) => (
                  <StopCard key={s.id} stop={s} />
                ))}
              </div>
            </section>
          ))}
          {stops.length === 0 && <p className="muted">No stops yet.</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
