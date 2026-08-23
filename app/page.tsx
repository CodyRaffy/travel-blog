import SiteHeader from "@/components/site/SiteHeader";
import HomeMap from "@/components/site/HomeMap";
import { getStops } from "@/lib/stops";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stops = await getStops();
  return (
    <div className="site">
      <SiteHeader overlay />
      <HomeMap stops={stops} />
    </div>
  );
}
