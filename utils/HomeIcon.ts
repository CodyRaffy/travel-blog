import L from "leaflet";

/** Simple house glyph for home-base stays and the current-home marker. */
const HOUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="34" height="34">
  <path d="M20 4 L37 19 h-5 v15 a2 2 0 0 1 -2 2 H10 a2 2 0 0 1 -2 -2 V19 H3 Z" fill="#2e6b4f" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="16" y="24" width="8" height="12" rx="1" fill="#ffffff"/>
</svg>`;

const homeIcon = L.divIcon({
  className: "home-marker",
  html: HOUSE_SVG,
  iconSize: [34, 34],
  iconAnchor: [17, 32],
});

export { homeIcon };
