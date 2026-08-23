/**
 * How the family travelled for a given stop (the vehicle drawn on the map while
 * driving the leg *into* that stop). Flights are detected automatically from legs
 * with no road route, so there is no "plane" vehicle.
 */
export type VehicleKey = "fifth_wheel" | "minivan" | "motorhome";

export interface Vehicle {
  key: VehicleKey;
  label: string;
  description: string;
  /** Side view facing right (east); flipped with CSS when heading west. */
  svg: string;
  size: [number, number];
  anchor: [number, number];
}

export const DEFAULT_VEHICLE: VehicleKey = "fifth_wheel";

/** The full-time RV years. Stops outside this window default to the minivan. */
export const RV_TRIP_START = "2020-12-01";
export const RV_TRIP_END = "2024-04-30";

export function defaultVehicleFor(arrivalIso: string): VehicleKey {
  const d = arrivalIso.slice(0, 10);
  return d >= RV_TRIP_START && d <= RV_TRIP_END ? "fifth_wheel" : "minivan";
}

export const VEHICLES: Vehicle[] = [
  {
    key: "fifth_wheel",
    label: "Truck & fifth wheel",
    description: "The dually pulling the 38 ft fifth wheel — the main trip.",
    size: [78, 23],
    anchor: [39, 21],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 46" width="78" height="23">
  <path d="M3 36 V14 a5 5 0 0 1 5 -5 H86 a4 4 0 0 1 4 4 v1 H104 v7 H90 v15 Z" fill="#fff" stroke="#23312b" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="9" y="15" width="12" height="8" rx="1.5" fill="#2e6b4f"/><rect x="27" y="15" width="12" height="8" rx="1.5" fill="#2e6b4f"/>
  <rect x="45" y="15" width="12" height="8" rx="1.5" fill="#2e6b4f"/><rect x="63" y="15" width="16" height="8" rx="1.5" fill="#2e6b4f"/>
  <rect x="3" y="29" width="87" height="2.5" fill="#b5472f"/>
  <path d="M92 36 V21 h2 v4 h24 V18 a3 3 0 0 1 3 -3 h13 l10 9 h3 a2 2 0 0 1 2 2 v10 Z" fill="#8d959a" stroke="#23312b" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="94" y="21" width="24" height="2.5" fill="#6b7479"/>
  <path d="M96 36 a12 7 0 0 1 24 0 Z" fill="#8d959a" stroke="#23312b" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M125 18 h10 l8 7 h-18 Z" fill="#2a3338"/>
  <rect x="92" y="33" width="61" height="2" fill="#5f686d"/>
  <circle cx="30" cy="37" r="5" fill="#23312b"/><circle cx="30" cy="37" r="1.8" fill="#fff"/>
  <circle cx="46" cy="37" r="5" fill="#23312b"/><circle cx="46" cy="37" r="1.8" fill="#fff"/>
  <circle cx="103" cy="38" r="5" fill="#23312b"/><circle cx="112" cy="38" r="5" fill="#23312b"/><circle cx="112" cy="38" r="1.8" fill="#fff"/>
  <circle cx="140" cy="37" r="5" fill="#23312b"/><circle cx="140" cy="37" r="1.8" fill="#fff"/>
</svg>`,
  },
  {
    key: "minivan",
    label: "Minivan",
    description: "Road trips before and after the RV years.",
    size: [46, 22],
    anchor: [23, 20],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 44" width="46" height="22">
  <path d="M4 34 V22 a4 4 0 0 1 4 -4 h14 l10 -9 h30 a4 4 0 0 1 3 1.5 l12 11.5 h8 a3 3 0 0 1 3 3 v9 Z" fill="#3f5fa8" stroke="#23312b" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M24 18 l8 -7 h12 v7 Z" fill="#2a3338"/><path d="M48 11 h11 l8 7 H48 Z" fill="#2a3338"/>
  <rect x="4" y="30" width="84" height="2" fill="#23312b" opacity="0.35"/>
  <circle cx="22" cy="35" r="5" fill="#23312b"/><circle cx="22" cy="35" r="1.8" fill="#fff"/>
  <circle cx="70" cy="35" r="5" fill="#23312b"/><circle cx="70" cy="35" r="1.8" fill="#fff"/>
</svg>`,
  },
  {
    key: "motorhome",
    label: "Motorhome (rental)",
    description: "A rented Winnebago-style motorhome, e.g. the Alaska trip.",
    size: [44, 28],
    anchor: [22, 26],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40" width="44" height="28">
  <path d="M4 34 V16 a4 4 0 0 1 4 -4 H40 l12 9 H58 a3 3 0 0 1 3 3 v10 H4 Z" fill="#fff" stroke="#23312b" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="10" y="17" width="10" height="8" rx="1.5" fill="#2e6b4f"/><rect x="24" y="17" width="10" height="8" rx="1.5" fill="#2e6b4f"/>
  <path d="M41 17 l8 6 H41 Z" fill="#2e6b4f"/><rect x="4" y="29" width="57" height="2.5" fill="#b5472f"/>
  <circle cx="17" cy="35" r="4.5" fill="#23312b"/><circle cx="17" cy="35" r="1.6" fill="#fff"/>
  <circle cx="49" cy="35" r="4.5" fill="#23312b"/><circle cx="49" cy="35" r="1.6" fill="#fff"/>
</svg>`,
  },
];

export const VEHICLE_KEYS = VEHICLES.map((v) => v.key);

export function vehicleByKey(key: string | null | undefined): Vehicle {
  return VEHICLES.find((v) => v.key === key) ?? VEHICLES[0];
}
