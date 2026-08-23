/**
 * Cluster located photos into candidate stops for review.
 *
 *   npm run photos:cluster [-- --radius 30 --min-days 2 --min-photos 15 --max-gap 7 --no-geocode]
 *
 * Replaces pending candidates; approved/rejected decisions are kept and not re-proposed.
 */
import { generateStopCandidates } from "../lib/stopCandidates";

const args = process.argv.slice(2);
const num = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? Number(args[i + 1]) : undefined;
};

generateStopCandidates({
  radiusKm: num("--radius"),
  minDays: num("--min-days"),
  minPhotos: num("--min-photos"),
  maxGapDays: num("--max-gap"),
  geocode: !args.includes("--no-geocode"),
  onProgress: (m) => console.log(`  ${m}`),
})
  .then((r) => {
    console.log(
      `${r.clusters} clusters → ${r.proposed} new candidates (${r.skippedAlreadyHandled} overlap existing stops/decisions, ${r.skippedAtHome} near home outside the RV years), ${r.geocoded} named.`
    );
    console.log("Review them at http://localhost:3000/admin/stops/review");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
