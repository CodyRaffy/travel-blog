"use client";

export const OVERNIGHT_HELP =
  "A place you only slept, not a destination: Harvest Hosts, Cracker Barrel or Walmart lots, boondocking, rest areas, a one-night campsite on the way somewhere. Shown smaller on the map and timeline.";

export const HOME_HELP =
  "Back at home base in Tallahassee between legs of the trip. Shown with the house icon on the map.";

export const CITY_HELP = "A city or town visit: the place itself was the point (sightseeing, family, errands), not a park or campground.";

/** Small circled "?" that shows `text` on hover / focus. */
export default function HelpIcon({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        marginLeft: 4,
        borderRadius: "50%",
        background: "#6c757d",
        color: "white",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "help",
        verticalAlign: "middle",
      }}
    >
      ?
    </span>
  );
}
