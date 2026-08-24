import L from "leaflet";

/** Kilkierane house (and the KOA era) — the original home marker photo. */
const homeIcon = new L.Icon({
  iconUrl: "/img/Home.jpg",
  iconRetinaUrl: "/img/Home.jpg",
  iconSize: new L.Point(30, 40),
  className: "leaflet-div-icon",
});

/** 2518 Killarney Way — home since April 2024. */
const killarneyIcon = new L.Icon({
  iconUrl: "/img/KillarneyHome.jpg",
  iconRetinaUrl: "/img/KillarneyHome.jpg",
  iconSize: new L.Point(36, 36),
  className: "leaflet-div-icon",
});

export { homeIcon, killarneyIcon };
