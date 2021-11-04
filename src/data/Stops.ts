import { StopInfo } from "../models/StopInfo";

export const stops: StopInfo[] = [
  {
    name: "Torreya State Park",
    latLongTuple: [30.569744223517564, -84.95110673652559],
    link: "https://www.floridastateparks.org/parks-and-trails/torreya-state-park",
    statePark: true,
    nationalMonument: false,
    nationalPark: false,
    arrivalDate: new Date("02/07/2021"),
    departureDate: new Date("02/12/2021"),
  },
  {
    name: "Blackwater River State Park",
    latLongTuple: [30.711958657572282, -86.87860216834461],
    link: "https://www.floridastateparks.org/parks-and-trails/blackwater-river-state-park",
    statePark: true,
    nationalMonument: false,
    nationalPark: false,
    arrivalDate: new Date("02/12/2021"),
    departureDate: new Date("02/13/2021"),
  },
  {
    name: "St. Bernard State Park",
    latLongTuple: [29.864355474069658, -89.90035309083517],
    link: "https://www.floridastateparks.org/parks-and-trails/torreya-state-park",
    statePark: true,
    nationalMonument: false,
    nationalPark: false,
    arrivalDate: new Date("02/13/2021"),
    departureDate: new Date("02/20/2021"),
  },
];
