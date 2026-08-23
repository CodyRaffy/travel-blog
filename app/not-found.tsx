import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";

export default function NotFound() {
  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap wrap--narrow">
        <div className="eyebrow">Wrong turn</div>
        <h1>That page isn&apos;t on the map.</h1>
        <p className="lede">
          <Link href="/">Back to the map</Link> or <Link href="/stops">browse the stops</Link>.
        </p>
      </main>
    </div>
  );
}
