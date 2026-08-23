import Link from "next/link";
import { StopInfoResponse } from "@/models/StopInfo";
import { fmtRange, fmtNights } from "@/lib/format";

export default function StopCard({ stop }: { stop: StopInfoResponse }) {
  return (
    <Link href={`/stops/${stop.slug}`} className={`card stop-card${stop.overnightStop ? " stop-card--overnight" : ""}`}>
      {stop.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={stop.coverUrl} alt="" loading="lazy" />
      ) : (
        <div className="noimg" />
      )}
      <div className="body">
        <h3>{stop.name}</h3>
        {stop.overnightStop && <span className="badge">Overnight</span>}
        {stop.homeBase && <span className="badge">Home base</span>}
        {stop.cityStop && <span className="badge">City</span>}
        <div className="dates">
          {fmtRange(stop.arrivalDate, stop.departureDate)} · {fmtNights(stop.arrivalDate, stop.departureDate)}
        </div>
      </div>
    </Link>
  );
}
