/**
 * Fill in campground/park names and websites for pending stop candidates
 * from OpenStreetMap (Overpass) + Wikidata. Safe to re-run; results are cached.
 *
 *   npm run photos:lookup            (dev DB)
 *   npm run prod -- photos:lookup    (live DB)
 */
import { getStopCandidates, lookupStopCandidatePlace } from "../lib/stopCandidates";

async function main() {
  const pending = await getStopCandidates("pending");
  let named = 0;
  let linked = 0;
  for (const [i, c] of pending.entries()) {
    const res = await lookupStopCandidatePlace(c.id);
    if (res?.place) {
      named++;
      if (res.place.website) linked++;
      console.log(`${i + 1}/${pending.length} ${c.arrivalDate.slice(0, 10)}  ${res.place.name}${res.place.website ? "  " + res.place.website : ""}`);
    } else {
      console.log(`${i + 1}/${pending.length} ${c.arrivalDate.slice(0, 10)}  (no place found; keeping "${c.suggestedName}")`);
    }
  }
  console.log(`\nDone: ${named} of ${pending.length} candidates matched a named place, ${linked} with a website.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
