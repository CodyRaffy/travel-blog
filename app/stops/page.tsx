import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import StopCard from "@/components/site/StopCard";
import { getStops } from "@/lib/stops";
import { yearOf, nights } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stops" };

export default async function StopsPage() {
  const stops = await getStops();
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
